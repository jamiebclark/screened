"use client";

import { FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AccountSettingsProps {
  user: {
    name: string;
    email: string;
    hasCredentialPassword: boolean;
  };
}

export function AccountSettings({ user: initialUser }: AccountSettingsProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [name, setName] = useState(initialUser.name);
  const [email, setEmail] = useState(initialUser.email);
  const [profilePassword, setProfilePassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const emailChanged =
    email.trim().toLowerCase() !== initialUser.email.toLowerCase();
  const profileNeedsPassword =
    initialUser.hasCredentialPassword && emailChanged;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (profileNeedsPassword && !profilePassword) {
      setProfileError("Enter your current password to change your email.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setProfileError("Display name cannot be empty.");
      return;
    }

    const payload: Record<string, string> = {};
    if (trimmedName !== initialUser.name) payload.name = trimmedName;
    if (trimmedEmail !== initialUser.email.toLowerCase())
      payload.email = trimmedEmail;
    if (Object.keys(payload).length === 0) {
      setProfileError("No profile changes to save.");
      return;
    }
    if (profileNeedsPassword) {
      payload.currentPassword = profilePassword;
    }

    setProfileSaving(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        user?: { name: string; email: string };
        error?: string;
      };
      if (!res.ok) {
        setProfileError(data.error ?? "Could not update profile.");
        return;
      }
      if (data.user) {
        setName(data.user.name);
        setEmail(data.user.email);
        setProfilePassword("");
        await updateSession({
          user: { name: data.user.name, email: data.user.email },
        });
        router.refresh();
      }
    } catch {
      setProfileError("Something went wrong. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    const payload: Record<string, string> = { newPassword };
    if (initialUser.hasCredentialPassword) {
      if (!currentPassword) {
        setPasswordError("Enter your current password.");
        return;
      }
      payload.currentPassword = currentPassword;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPasswordError(data.error ?? "Could not update password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your display name and sign-in email for Screened.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Display name</Label>
              <Input
                id="account-name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {profileNeedsPassword && (
              <div className="space-y-2">
                <Label htmlFor="account-profile-password">
                  Current password
                </Label>
                <Input
                  id="account-profile-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Required to confirm your identity when changing email.
                </p>
              </div>
            )}
            {profileError && (
              <p className="text-sm text-destructive" role="alert">
                {profileError}
              </p>
            )}
            <Button type="submit" disabled={profileSaving}>
              {profileSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            {initialUser.hasCredentialPassword
              ? "Change the password you use with email sign-in."
              : "You signed in with Plex. Set a password if you also want to sign in with email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            {initialUser.hasCredentialPassword && (
              <div className="space-y-2">
                <Label htmlFor="account-current-password">
                  Current password
                </Label>
                <Input
                  id="account-current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="account-new-password">
                {initialUser.hasCredentialPassword
                  ? "New password"
                  : "Password"}
              </Label>
              <Input
                id="account-new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-confirm-password">
                Confirm new password
              </Label>
              <Input
                id="account-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive" role="alert">
                {passwordError}
              </p>
            )}
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialUser.hasCredentialPassword
                ? "Update password"
                : "Set password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
