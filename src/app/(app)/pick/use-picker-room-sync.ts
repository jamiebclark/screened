"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  withScoringDefaults,
  type PickerRoomState,
} from "@/lib/picker-room-state";
import { hydratePickerFingerprintIfNeeded } from "@/lib/picker-score-fingerprint";

const POLL_MS = 2500;

export type PickerRemoteAppliedMeta = {
  sourceUserId: string;
  sourceTabId: string;
};

export type UsePickerRoomSyncOptions = {
  /**
   * Called when another tab (or user)’s state was merged in. Omitted for initial `sync` and polling
   * (no `sourceUserId`) so the UI does not show a false “everyone changed everything” line.
   */
  onRemoteApplied?: (
    previous: PickerRoomState,
    next: PickerRoomState,
    meta: PickerRemoteAppliedMeta,
  ) => void;
};

type UserLite = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

function stableStringify(s: PickerRoomState): string {
  return JSON.stringify(s);
}

/**
 * When `roomId` is set, syncs room state to the server with debounced PATCH,
 * and receives updates via EventSource, falling back to GET polling if SSE fails.
 */
export function usePickerRoomSync(
  roomId: string | null,
  tabId: string,
  currentUser: UserLite,
  state: PickerRoomState,
  setState: Dispatch<SetStateAction<PickerRoomState>>,
  options?: UsePickerRoomSyncOptions,
) {
  const router = useRouter();
  const onRemoteAppliedRef = useRef(options?.onRemoteApplied);
  useLayoutEffect(() => {
    onRemoteAppliedRef.current = options?.onRemoteApplied;
  }, [options?.onRemoteApplied]);
  const lastPushedJson = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyRemote = useCallback(
    (
      next: PickerRoomState,
      _version: number,
      sourceTabId: string,
      sourceUserId: string,
    ) => {
      if (sourceTabId && sourceTabId === tabId) return;
      setState((prev) => {
        const incoming = hydratePickerFingerprintIfNeeded(
          withScoringDefaults(next),
        );
        const merged = ensureCurrentUserInRoom(incoming, currentUser);
        lastPushedJson.current = stableStringify(merged);
        if (sourceUserId && onRemoteAppliedRef.current) {
          onRemoteAppliedRef.current(prev, merged, {
            sourceUserId,
            sourceTabId,
          });
        }
        return merged;
      });
    },
    // tabId must be current so we skip only our own tab's echo
    [tabId, currentUser, setState],
  );

  useEffect(() => {
    if (!roomId || !tabId) return;
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    const es = new EventSource(`/api/picker/rooms/${roomId}/stream`, {
      withCredentials: true,
    });
    esRef.current = es;

    es.addEventListener("sync", (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data) as {
          version: number;
          state: PickerRoomState;
          sourceTabId: string;
          sourceUserId?: string;
        };
        applyRemote(d.state, d.version, d.sourceTabId, d.sourceUserId ?? "");
      } catch {
        // ignore
      }
    });
    es.addEventListener("update", (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data) as {
          version: number;
          state: PickerRoomState;
          sourceTabId: string;
          sourceUserId?: string;
        };
        applyRemote(d.state, d.version, d.sourceTabId, d.sourceUserId ?? "");
      } catch {
        // ignore
      }
    });
    const startPoll = () => {
      if (pollRef.current) return;
      try {
        es.close();
      } catch {
        // ignore
      }
      const poll = () => {
        void fetch(`/api/picker/rooms/${roomId}`)
          .then((r) => {
            if (r.status === 404) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              router.replace("/pick");
              return null;
            }
            return r.ok ? r.json() : null;
          })
          .then((d: { version?: number; state?: PickerRoomState } | null) => {
            if (d?.state) applyRemote(d.state, d.version ?? 0, "", "");
          });
      };
      void poll();
      pollRef.current = setInterval(poll, POLL_MS);
    };

    es.onerror = () => {
      startPoll();
    };

    return () => {
      es.close();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [roomId, tabId, applyRemote, router]);

  useEffect(() => {
    if (!roomId || !tabId) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const j = stableStringify(state);
      if (j === lastPushedJson.current) return;
      void (async () => {
        const res = await fetch(`/api/picker/rooms/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state, sourceTabId: tabId }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            state: PickerRoomState;
            version: number;
          };
          lastPushedJson.current = stableStringify(data.state);
        }
      })();
    }, 400);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [roomId, state, tabId]);
}

/**
 * If the signed-in user opened a shared room but is not in participants yet, add them.
 * Also re-applies on foreign updates so the current user is never dropped.
 */
export function ensureCurrentUserInRoom(
  s: PickerRoomState,
  me: UserLite,
): PickerRoomState {
  if (s.participants.some((p) => p.id === me.id)) return s;
  return { ...s, participants: [me, ...s.participants] };
}
