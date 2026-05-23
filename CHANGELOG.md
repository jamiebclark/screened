## [1.56.0](https://github.com/jamiebclark/screened/compare/v1.55.3...v1.56.0) (2026-05-23)

### Features

* **lists:** add inline note editing to item modal ([8e2e4ae](https://github.com/jamiebclark/screened/commit/8e2e4ae6a05ebef3c33c521d007499b88d3078ad))
* **lists:** add list mode API routes and feature flag gating ([dad3e1b](https://github.com/jamiebclark/screened/commit/dad3e1bdc99fe78a65f50778629421f703538543))
* **lists:** add list mode fields and migration ([ceb850d](https://github.com/jamiebclark/screened/commit/ceb850d3db0074f373643456b6104e08bf1f0ff4))
* **lists:** add list modes UI — ranked view, settings panel, preset selector ([0f8dd1f](https://github.com/jamiebclark/screened/commit/0f8dd1fe64fadaf7b42a40c0effb1297244f5ec6))
* **lists:** add list presets library with applyPreset helper ([a1351c4](https://github.com/jamiebclark/screened/commit/a1351c4d0008423483c143ba3389bb59e529390a))
* **lists:** add spoiler toggle to FAB add modal ([a3ce626](https://github.com/jamiebclark/screened/commit/a3ce626760060f9d460c562cdb6ae31d7ed4f427))
* **lists:** add WYSIWYG markdown editor for notes and comments ([10f71e5](https://github.com/jamiebclark/screened/commit/10f71e5f186d6c996425aba1b1c42a509869bd2f))
* **lists:** highlight Add button with primary background ([717ce6a](https://github.com/jamiebclark/screened/commit/717ce6a5302662ccb6047d6e0a4bc7e1ee56540c))
* **lists:** larger posters and always-visible notes in list view ([38e504b](https://github.com/jamiebclark/screened/commit/38e504b56fea9ffdcadc6bf48fdf59fe48a29514))
* **lists:** render item notes as markdown with spoiler support ([e7b6730](https://github.com/jamiebclark/screened/commit/e7b6730d57faa110d26b5d2027c9b37261428d8d))
* **lists:** replace FAB with header icon buttons; wire members link to members tab ([15a3c42](https://github.com/jamiebclark/screened/commit/15a3c4289409c5986e34cc4c3cc3af7edd0f912e))
* **lists:** replace inline search bar with FAB + add modal ([7489e11](https://github.com/jamiebclark/screened/commit/7489e119576bd91ba9a6dcf9eb2f7f2a69fdaf56))
* **lists:** replace sidebar with settings modal ([9f6a5d3](https://github.com/jamiebclark/screened/commit/9f6a5d33413ce38f518326919c127fac05366248))

### Bug Fixes

* **lists:** accept noteIsSpoiler on POST /items ([83ff78c](https://github.com/jamiebclark/screened/commit/83ff78c7436ba048485d3f90df3d99696281fe36))
* **lists:** correct note display position in modal and list view ([f814aaf](https://github.com/jamiebclark/screened/commit/f814aafc5867cd5a265d230a36e153440239545b))
* **lists:** fix FAB confirm step title overflow ([6aa71a6](https://github.com/jamiebclark/screened/commit/6aa71a643f1ce76007c3cdea8c79fd6883e19928))
* **lists:** prevent title overflow in FAB confirm step ([6cc25ba](https://github.com/jamiebclark/screened/commit/6cc25bad96476ad1f6e6732a69ac1738dc9d6a6a))
* **lists:** sync item note state in list after save to prevent stale modal ([148d6f3](https://github.com/jamiebclark/screened/commit/148d6f3353f032aa2d9c228e05f12fdea7f83252))

## [1.55.3](https://github.com/jamiebclark/screened/compare/v1.55.2...v1.55.3) (2026-05-19)

### Bug Fixes

* **auth:** break redirect loop for deleted accounts with stale JWT ([4948f66](https://github.com/jamiebclark/screened/commit/4948f66ae881aa74b8c6b9d58eb804ce1859bc41))

## [1.55.2](https://github.com/jamiebclark/screened/compare/v1.55.1...v1.55.2) (2026-05-19)

### Bug Fixes

* **lists:** track per-list pending state and fix page refresh after add ([f2e26a5](https://github.com/jamiebclark/screened/commit/f2e26a50c2328e412f28c32b1cf2032f147b9fe7))

## [1.55.1](https://github.com/jamiebclark/screened/compare/v1.55.0...v1.55.1) (2026-05-19)

### Bug Fixes

* **admin:** handle duplicate email when inviting existing Plex username ([9c6c0b8](https://github.com/jamiebclark/screened/commit/9c6c0b8bf68d42c777b8590caf6456a5264e8890))

## [1.55.0](https://github.com/jamiebclark/screened/compare/v1.54.0...v1.55.0) (2026-05-18)

### Features

* **pick:** redesign session controls and filter tile layout ([44ce4f7](https://github.com/jamiebclark/screened/commit/44ce4f717172cfeaedfe77c30e12bc406f2ba702))

## [1.54.0](https://github.com/jamiebclark/screened/compare/v1.53.1...v1.54.0) (2026-05-18)

### Features

* **browse:** show friend watcher overlays on browse cards ([d19de86](https://github.com/jamiebclark/screened/commit/d19de86131057d476c662c18c24ef7da1264248c))
* **components:** add friend watcher avatar overlay to MediaCard ([c95828e](https://github.com/jamiebclark/screened/commit/c95828e4c31745809c943a2c5155d091e1cb5235))
* **home:** add friends recently watched rail ([38e6977](https://github.com/jamiebclark/screened/commit/38e69772ba3001075b7b32ad939cb121693a6707))
* **lib:** add friend watch query helpers ([ac2d05f](https://github.com/jamiebclark/screened/commit/ac2d05fc3dc6be1744d5b068814ec921496ec587))
* **watchlist:** show friend watcher overlays on watchlist cards ([603a64b](https://github.com/jamiebclark/screened/commit/603a64bfbeb6b09de7f9cf8e001c51d2070ae68e))

### Bug Fixes

* **movies:** rename "Friends on Letterboxd" to "Users on Letterboxd" ([b0f5d67](https://github.com/jamiebclark/screened/commit/b0f5d678930be2ceec6a41671b309674a2febeef))

## [1.53.1](https://github.com/jamiebclark/screened/compare/v1.53.0...v1.53.1) (2026-05-17)

### Bug Fixes

* **movies:** deduplicate letterboxd reviews shown in watch history ([dc2c77d](https://github.com/jamiebclark/screened/commit/dc2c77daeaed44afbf23e492516aba963bf99f59))

## [1.53.0](https://github.com/jamiebclark/screened/compare/v1.52.0...v1.53.0) (2026-05-17)

### Features

* **letterboxd:** extract and store review text from RSS diary entries ([e442eed](https://github.com/jamiebclark/screened/commit/e442eed284c2f81f1dcef786a98d1edc9dc2ed69))
* **movies:** show friends' letterboxd reviews on movie page ([3a84e36](https://github.com/jamiebclark/screened/commit/3a84e363efb3037faa16cc2ac6667cd1d005bdb4))
* **ui:** apply bold typography scale across all pages and nav ([bf2fa87](https://github.com/jamiebclark/screened/commit/bf2fa8799b648a861008e693a158e7b6264c4ffa))

### Bug Fixes

* **ui:** correct visual inconsistencies from typography scale update ([af1cf29](https://github.com/jamiebclark/screened/commit/af1cf29dacfc2b028bbccfb281768c3186b153f6))

## [1.52.0](https://github.com/jamiebclark/screened/compare/v1.51.1...v1.52.0) (2026-05-17)

### Features

* **browse:** add BrowseFilter types, parse/serialize utils and vitest tests ([7cb9d68](https://github.com/jamiebclark/screened/commit/7cb9d68a61e9bbea8092aff4b5c62075dc9b4dfe))
* **browse:** add sort and order helpers to browse-utils ([ac774bc](https://github.com/jamiebclark/screened/commit/ac774bc4ab32220c82a4fa3a3a5896bde80abf41))
* **browse:** multi-genre, sort, year range, and person filters on browse page ([f5c4624](https://github.com/jamiebclark/screened/commit/f5c4624eda0d323dba68be5479ce7a08245509d3))
* **browse:** refactor discover API to DiscoverOptions and add getPersonCreditTmdbIds ([4ef390f](https://github.com/jamiebclark/screened/commit/4ef390fc27c7940e5ebba4fbde4b9aba3dd11a80))
* **browse:** replace BrowseFilters with collapsible BrowseFilterPanel and PersonTagInput ([9347405](https://github.com/jamiebclark/screened/commit/934740546b92d3c34d3107de6c24b2a27bdc6c58))

## [1.51.1](https://github.com/jamiebclark/screened/compare/v1.51.0...v1.51.1) (2026-05-17)

### Bug Fixes

* **person:** remove deleted TitlePageTopNav import ([1df2cf8](https://github.com/jamiebclark/screened/commit/1df2cf8730a9f78f1c8065072af6a2d1ae39875c))

## [1.51.0](https://github.com/jamiebclark/screened/compare/v1.50.0...v1.51.0) (2026-05-17)

### Features

* **browse:** add /browse discover page with genre, type, and user filters ([61455aa](https://github.com/jamiebclark/screened/commit/61455aa13df99765bf815d561483f8527da8d336))
* **browse:** genre-linked badges and /browse discover page ([#005](https://github.com/jamiebclark/screened/issues/005)) ([8e0f675](https://github.com/jamiebclark/screened/commit/8e0f67587647a8d80cc2ce43ca97b59c12d03900))
* **components:** replace Movie/TV text badge with Clapperboard/Tv icon badges ([341926b](https://github.com/jamiebclark/screened/commit/341926bf69e8cbf4f266403e839cf637fd5b6982))
* **lists:** add comment CRUD and read-tracking API routes ([9a20799](https://github.com/jamiebclark/screened/commit/9a207992c881999b676789fd4b90a9902d28bfef))
* **lists:** add ListItemComment and ListItemCommentRead schema models ([0845769](https://github.com/jamiebclark/screened/commit/0845769ad46c15b549c17126251fc1dde9c52784))
* **lists:** comments section in item modal with unread badge on poster ([efcbc50](https://github.com/jamiebclark/screened/commit/efcbc5066a13fb8a14d2bb082d9215a1a8a0afe8))
* **lists:** make genre tags in item modal link to browse page ([687ae58](https://github.com/jamiebclark/screened/commit/687ae5833bea99bacbfb8914fa010ac84c19b62d))
* **movies,tv:** make genre badges link to browse page, remove title-page-top-nav ([f03c9cd](https://github.com/jamiebclark/screened/commit/f03c9cd6177ef0e00d89d1519fb2627cbcf49b3d))
* **tmdb:** add genre list and discover API wrappers ([f112bce](https://github.com/jamiebclark/screened/commit/f112bce7cba43c3cf22df094d39ec8add46f16bf))

### Bug Fixes

* **browse:** flip library/seen/friends filters to DB-first queries ([feb9772](https://github.com/jamiebclark/screened/commit/feb9772e7513701c9fa35fb9685cb082a95a64bd))
* **lists:** lock vote pill height and add global cursor-pointer for buttons ([9dad345](https://github.com/jamiebclark/screened/commit/9dad34530fc04b4acb115b808921eae80f3d9a42))

## [1.50.0](https://github.com/jamiebclark/screened/compare/v1.49.0...v1.50.0) (2026-05-17)

### Features

* **lists:** always-visible vote pill on cards, clickable for members ([ae5375e](https://github.com/jamiebclark/screened/commit/ae5375ea7ebe9fd356c4a106917026c7ed3bcb4d))
* **lists:** replace below-poster text with always-visible card overlays ([13da1c0](https://github.com/jamiebclark/screened/commit/13da1c0b6e69bb6946e358fbd20054736bf21e54))

## [1.49.0](https://github.com/jamiebclark/screened/compare/v1.48.0...v1.49.0) (2026-05-17)

### Features

* **lists:** open item detail modal instead of navigating to title page ([b015689](https://github.com/jamiebclark/screened/commit/b015689bc865cd75b68785d302fa9c748e169724))
* **media-card:** add onClick prop to render as button instead of link ([c57a814](https://github.com/jamiebclark/screened/commit/c57a8148263da6f7c96ed885a27f43cfca831775))

### Bug Fixes

* **lists:** use Lucide icons for vote display in modal non-member view ([0c16a96](https://github.com/jamiebclark/screened/commit/0c16a96f4dc0967384beef1146b6d6a36f720a65))

## [1.48.0](https://github.com/jamiebclark/screened/compare/v1.47.2...v1.48.0) (2026-05-16)

### Features

* **lists:** add ListItemVote schema and migration ([69e37b8](https://github.com/jamiebclark/screened/commit/69e37b850c4b6d38f6435914ee1caddb9f55f4c6))
* **lists:** add vote API endpoint for list items ([ceafa2a](https://github.com/jamiebclark/screened/commit/ceafa2a7abdc1c25c6be7276da3a82fe60e4dc68))
* **lists:** add voting and sort controls to list detail page ([b6ed947](https://github.com/jamiebclark/screened/commit/b6ed947465ce3ab4a3db171b465cd8bddc46572e))

## [1.47.2](https://github.com/jamiebclark/screened/compare/v1.47.1...v1.47.2) (2026-05-16)

### Bug Fixes

* **titles:** fetch cast & crew from TMDB directly on movie and TV pages ([2da9d22](https://github.com/jamiebclark/screened/commit/2da9d22c92544e9e7f30cc91cc62ee17a790d1a8))

## [1.47.1](https://github.com/jamiebclark/screened/compare/v1.47.0...v1.47.1) (2026-05-15)

### Bug Fixes

* **picker:** add missing filtersOpen field to test fixture ([6764ae9](https://github.com/jamiebclark/screened/commit/6764ae90229a97adbc2e2548e6759a8c38c56b8a))

## [1.47.0](https://github.com/jamiebclark/screened/compare/v1.46.0...v1.47.0) (2026-05-15)

### Features

* **docker:** add PORT env var to configure host port binding ([b02def4](https://github.com/jamiebclark/screened/commit/b02def47715e7cde466a39e9dd0d05403ec6d9ec))

## [1.46.0](https://github.com/jamiebclark/screened/compare/v1.45.7...v1.46.0) (2026-05-15)

### Features

* **picker:** replace dual-column layout with modal-based filter bar ([ab33d3a](https://github.com/jamiebclark/screened/commit/ab33d3aa3dc462ca1c45fff4b5c4ad8320628e54))

### Bug Fixes

* **picker:** update stale copy and remove 'optional' from filter modals ([8956622](https://github.com/jamiebclark/screened/commit/8956622d2e3267f261a8ca008d36906129c07a7f))

## [1.45.7](https://github.com/jamiebclark/screened/compare/v1.45.6...v1.45.7) (2026-05-14)

### Performance Improvements

* **picker:** reduce TMDB calls 3x via append_to_response and add 429 retry ([eb172e8](https://github.com/jamiebclark/screened/commit/eb172e8ea5185d5c0cf602b4678a6e70e3034f15))

## [1.45.6](https://github.com/jamiebclark/screened/compare/v1.45.5...v1.45.6) (2026-05-12)

### Bug Fixes

* **auth:** prevent redirect loop when signed-in user visits /login ([a8f469b](https://github.com/jamiebclark/screened/commit/a8f469ba8f8141f1b36bb011c2a881ef22bf00a9))

## [1.45.5](https://github.com/jamiebclark/screened/compare/v1.45.4...v1.45.5) (2026-05-12)

### Bug Fixes

* **auth:** preserve destination URL through login, register, and onboarding ([ec39d24](https://github.com/jamiebclark/screened/commit/ec39d242970ee670959a960085f12794d12e2c0e))

## [1.45.4](https://github.com/jamiebclark/screened/compare/v1.45.3...v1.45.4) (2026-05-12)

### Bug Fixes

* **logger:** anchor ring buffer to globalThis to survive webpack chunk splits ([000af6d](https://github.com/jamiebclark/screened/commit/000af6d01b11e1d26a9d0953cca1acaa04d2bf54))

## [1.45.3](https://github.com/jamiebclark/screened/compare/v1.45.2...v1.45.3) (2026-05-12)

### Bug Fixes

* **admin:** align breadcrumbs with page content containers ([95ef8d1](https://github.com/jamiebclark/screened/commit/95ef8d19c99e644de80ea46cf597419580ea2f48))

## [1.45.2](https://github.com/jamiebclark/screened/compare/v1.45.1...v1.45.2) (2026-05-12)

### Bug Fixes

* **cron:** fix instrumentation guard for standalone production ([ad85e7d](https://github.com/jamiebclark/screened/commit/ad85e7d14f3924265fc4b7f1824d6010d8fa9195))

## [1.45.1](https://github.com/jamiebclark/screened/compare/v1.45.0...v1.45.1) (2026-05-12)

### Bug Fixes

* **config:** add node-cron to serverExternalPackages ([a07aa30](https://github.com/jamiebclark/screened/commit/a07aa306501adde7f51d1ead97dbe5f4589a8307))
* **cron:** improve scheduler reliability and observability ([9006046](https://github.com/jamiebclark/screened/commit/90060469b4423b021aa0042e39af679bddfb4bf9))

## [1.45.0](https://github.com/jamiebclark/screened/compare/v1.44.0...v1.45.0) (2026-05-11)

### Features

* **cron:** migrate watch-party-confirm to internal scheduler, remove HTTP cron routes ([527b890](https://github.com/jamiebclark/screened/commit/527b890648abcee4b96b487b6013df9bc51c6f2c))

### Bug Fixes

* **docker:** restore indentation for STREAMING_COUNTRY env var ([8d9e9dd](https://github.com/jamiebclark/screened/commit/8d9e9ddb8075805766c4ecf2d8608f8533250f2b))

## [1.44.0](https://github.com/jamiebclark/screened/compare/v1.43.0...v1.44.0) (2026-05-11)

### Features

* **lists:** switch to poster-centric MediaCard layout with metadata footer ([b900bc4](https://github.com/jamiebclark/screened/commit/b900bc45c9cd60063cc21e02516ffc9785e5fadd))

### Bug Fixes

* **docker:** pass SITE_ADMIN_EMAILS env var into app container ([d309db1](https://github.com/jamiebclark/screened/commit/d309db1526c65d8170405af5190b123a89c26579))

## [1.43.0](https://github.com/jamiebclark/screened/compare/v1.42.0...v1.43.0) (2026-05-10)

### Features

* **admin:** add invite-by-Plex-username form to users page ([0e1e404](https://github.com/jamiebclark/screened/commit/0e1e4043e114b7f8db7272696ed925d52a668dd2))
* **api:** add POST /api/admin/users/invite endpoint ([8c46736](https://github.com/jamiebclark/screened/commit/8c46736c369ae04fdf5a56c853f17a0d4142cb91))
* **auth:** activate invited stub users on Plex OAuth sign-in ([44edd8d](https://github.com/jamiebclark/screened/commit/44edd8d5a7c7bc82eca844eae7555bd223eb6089))
* **lists:** show pending badge for invited members, link users to profiles ([e0c359a](https://github.com/jamiebclark/screened/commit/e0c359ab8540d5dc5a0a69e3026d527416976d29))

### Bug Fixes

* **history:** link friend names in daily history view to their profiles ([7c7eef8](https://github.com/jamiebclark/screened/commit/7c7eef8192f5259c0749247004f6aba90d232232))
* **notifications:** link requester and host names to their profiles ([57969a8](https://github.com/jamiebclark/screened/commit/57969a8a4e981a3f36fd8e26073fdcbcbe91cbeb))
* **watch-parties:** link host and invite user names to their profiles ([bd9e82a](https://github.com/jamiebclark/screened/commit/bd9e82af3da9aa585957a47855d35d9e7c61e2a8))

## [1.42.0](https://github.com/jamiebclark/screened/compare/v1.41.0...v1.42.0) (2026-05-09)

### Features

* **backup:** add daily pg_dump backup container with 7-day retention ([90eaecd](https://github.com/jamiebclark/screened/commit/90eaecd7dde9c7ff1e345d17dc03075777ac9184))

## [1.41.0](https://github.com/jamiebclark/screened/compare/v1.40.2...v1.41.0) (2026-05-09)

### Features

* **cron:** replace Docker cron containers with in-process node-cron scheduler ([76782c9](https://github.com/jamiebclark/screened/commit/76782c98f886e1cbaeaf1106f63f1e5dd5184fd8))

## [1.40.2](https://github.com/jamiebclark/screened/compare/v1.40.1...v1.40.2) (2026-05-09)

### Bug Fixes

* **cron:** remove set -e to prevent container exit on curl failure ([7f77b02](https://github.com/jamiebclark/screened/commit/7f77b02892a85d76a001021d9d09b81a0af8b9c2))

## [1.40.1](https://github.com/jamiebclark/screened/compare/v1.40.0...v1.40.1) (2026-05-09)

### Bug Fixes

* **deps:** upgrade next and eslint-config-next to 16.2.6 (security) ([401ae3c](https://github.com/jamiebclark/screened/commit/401ae3c1ab3079b7161b1e3f44413aa88f2a364f))

## [1.40.0](https://github.com/jamiebclark/screened/compare/v1.39.0...v1.40.0) (2026-05-09)

### Features

* **stats:** complete /stats page with all sections ([706d36e](https://github.com/jamiebclark/screened/commit/706d36eb10bcee824e70e9248e801e9d95883917))
* **stats:** complete stats-queries aggregation layer ([b071bc2](https://github.com/jamiebclark/screened/commit/b071bc2cb6fa5edda31552347d4b04f67e0e2d9c))

### Bug Fixes

* **tests:** mock discord module in list-access-requests test ([648609f](https://github.com/jamiebclark/screened/commit/648609f6e219b3a6276b7b9c8df719ba15f530e9))

## [1.39.0](https://github.com/jamiebclark/screened/compare/v1.38.0...v1.39.0) (2026-05-06)

### Features

* **upcoming:** add /upcoming page for watchlist releases ([#11](https://github.com/jamiebclark/screened/issues/11)) ([5a7a7cd](https://github.com/jamiebclark/screened/commit/5a7a7cd739d9486c34a60ba354cfc2cd8e18345d))

## [1.38.0](https://github.com/jamiebclark/screened/compare/v1.37.0...v1.38.0) (2026-05-05)

### Features

* **watchlist:** add sort/filter controls with URL persistence ([d7711a9](https://github.com/jamiebclark/screened/commit/d7711a94b9e1f1ac15419b40013f00699ac428d7))

## [1.37.0](https://github.com/jamiebclark/screened/compare/v1.36.0...v1.37.0) (2026-05-05)

### Features

* **enrichment:** add enrichmentVersion to MediaItem ([1c85f79](https://github.com/jamiebclark/screened/commit/1c85f793921b688b171b5955242e772a74784bbd))
* **enrichment:** lazy re-enrichment via version gate ([507f9ae](https://github.com/jamiebclark/screened/commit/507f9aec9841b150bf0d9fea94c0779d27c93093))
* **loading:** add loading skeletons to 7 high-traffic routes ([09c8767](https://github.com/jamiebclark/screened/commit/09c876700fa837773597c69d60e0db90fc73dcf1))

### Bug Fixes

* **a11y:** add aria-label to user menu button in nav ([f9de695](https://github.com/jamiebclark/screened/commit/f9de69502ce4698f5546987618c86668a01d43fb))
* **stats:** use directors array in top directors query ([593cea5](https://github.com/jamiebclark/screened/commit/593cea56a44cc23f0c2dc907425d5500cfefb703))
* **ux:** replace Suspense fallback=null with skeleton placeholders ([428f34b](https://github.com/jamiebclark/screened/commit/428f34b998b9265760820470744bdadc462ccd30))

### Performance Improvements

* **home:** collapse 4-step query waterfall into 2 parallel steps ([b0ed762](https://github.com/jamiebclark/screened/commit/b0ed7628edf7618ef65b1de574334c1b44122b06))
* **media-card:** add priority prop and fix dead compact conditional ([6a8340e](https://github.com/jamiebclark/screened/commit/6a8340e260455693d678cfd0e838a076664f73cc))

## [1.36.0](https://github.com/jamiebclark/screened/compare/v1.35.2...v1.36.0) (2026-05-04)

### Features

* **plex:** fall back to relay when direct connection fails ([d35319c](https://github.com/jamiebclark/screened/commit/d35319cb3f9509c75309bd786375cd6ae91cb940))
* **plex:** show relay warning in settings when sync used relay ([939277d](https://github.com/jamiebclark/screened/commit/939277d7722f92762d2c14650af89ed8bb87b81a))

## [1.35.2](https://github.com/jamiebclark/screened/compare/v1.35.1...v1.35.2) (2026-05-04)

### Bug Fixes

* **enrichment:** use created_by for TV creator, add force re-enrichment ([7d06d6b](https://github.com/jamiebclark/screened/commit/7d06d6b3828b5e3509980cbabac464e98664084a))

## [1.35.1](https://github.com/jamiebclark/screened/compare/v1.35.0...v1.35.1) (2026-05-04)

### Bug Fixes

* **cast-crew:** fall back to legacy director field for un-enriched items ([793b930](https://github.com/jamiebclark/screened/commit/793b930d03ed5b3a326ce7b4dbb946d44fa03115))

## [1.35.0](https://github.com/jamiebclark/screened/compare/v1.34.0...v1.35.0) (2026-05-04)

### Features

* **enrichment:** store person TMDB IDs on MediaItem during sync ([bb50f00](https://github.com/jamiebclark/screened/commit/bb50f0005b03400cf8c73054aaca0737a91f92a9))
* **person:** add acting credits section; auth person resolve route ([9fa40e0](https://github.com/jamiebclark/screened/commit/9fa40e040df31b11b9fe7e69ca1f839dd784a700))
* **schema:** add person TMDB ID fields to MediaItem ([be5e5a7](https://github.com/jamiebclark/screened/commit/be5e5a73eb5f9f23dba6706c5d85430ebbddaa78))
* **tmdb:** return TMDB person IDs from credits; add person helpers ([c000805](https://github.com/jamiebclark/screened/commit/c000805ef4b302ef44af29983e0212b71ad7c827))

## [1.34.0](https://github.com/jamiebclark/screened/compare/v1.33.0...v1.34.0) (2026-05-03)

### Features

* **components:** add person avatar and cast/crew section ([24249de](https://github.com/jamiebclark/screened/commit/24249de961df5c36946ba6c83e074ad149d2aff4))
* **movies,tv:** display cast and crew on title pages ([2563f23](https://github.com/jamiebclark/screened/commit/2563f239c05ac049b73eff579f9353e10ba75d12))
* **person:** add filmography query and name resolution API ([5e3d5ce](https://github.com/jamiebclark/screened/commit/5e3d5ced2a70ee31adcba6c654d2c814786f1d0e))
* **person:** add full TMDB directing credits on person pages ([bbff319](https://github.com/jamiebclark/screened/commit/bbff3194d9f95748e7218e87c1d604a6d43730b2))
* **person:** add person detail pages ([fb4aa28](https://github.com/jamiebclark/screened/commit/fb4aa2832a0743ed1bcd6c88b256da078415c18b))
* **person:** expandable biography with read more on person page ([8b17f3f](https://github.com/jamiebclark/screened/commit/8b17f3f76aa3c9fe993c99a028c4a9678b40562f))
* **tmdb:** add person API integration ([f71c916](https://github.com/jamiebclark/screened/commit/f71c91656035c9eaf5021490f857408f848ea6ef))

### Bug Fixes

* **person:** fetch profile photos for cast/crew on title pages ([df866cc](https://github.com/jamiebclark/screened/commit/df866cc7d3e49c9ac4374a548a7bf795bd9c758c))
* **person:** use full content width for person page helper copy ([4023a1d](https://github.com/jamiebclark/screened/commit/4023a1d58f9a6526f85344325537164f38f61686))

## [1.33.0](https://github.com/jamiebclark/screened/compare/v1.32.0...v1.33.0) (2026-05-03)

### Features

* **app-release:** add per-feature doc URLs to getRepoDocumentationLinks ([62abad6](https://github.com/jamiebclark/screened/commit/62abad65cb7201704f2683de944d7f1d9a3eb5ee))
* **history:** replace row list with grouped poster card grid ([5d80ab1](https://github.com/jamiebclark/screened/commit/5d80ab1da8f790275f5e80f7dfaaebf684789ea0))
* **lists,pick:** standardize nav page headers and add Learn more links ([dec2963](https://github.com/jamiebclark/screened/commit/dec29630341462519a2bca98e2be3335e7a66f9d))
* **watch-parties:** add page header with blurb, CTA button, and Learn more link ([e35dd59](https://github.com/jamiebclark/screened/commit/e35dd59fb9a22829b798728ca1c7a965b7255192))
* **watch-parties:** redesign list and detail with poster-forward cards ([eb608b9](https://github.com/jamiebclark/screened/commit/eb608b9b016db4595e7bec55846a8e130d4735ec))

## [1.32.0](https://github.com/jamiebclark/screened/compare/v1.31.0...v1.32.0) (2026-05-03)

### Features

* **calendar:** add watch parties to iCal feed ([dd9cf3f](https://github.com/jamiebclark/screened/commit/dd9cf3f82136d25b652508194e0f1bee239b514a))
* **discord:** add DM notification toggle to Discord settings ([a6325dc](https://github.com/jamiebclark/screened/commit/a6325dc4c989b4454aef5d3d95c5e206e2998b8b))
* **discord:** add PATCH /api/discord/dm-preference endpoint ([d2112ec](https://github.com/jamiebclark/screened/commit/d2112ec6d2830a9173b50887dd4b52d5dd30e1fe))
* **discord:** send DMs for friend-request and list-access-request notifications ([d29df1a](https://github.com/jamiebclark/screened/commit/d29df1aaea76c43ca753b9d18f08dedb6c647d43))
* **history:** add releases and watch parties to calendar views ([3808ee8](https://github.com/jamiebclark/screened/commit/3808ee8eed18b3590057b216f1613ca2b72d54cc))
* **history:** add schedule watch party shortcut from day view ([3871f97](https://github.com/jamiebclark/screened/commit/3871f97866b318c68f8ee1b6d7a847dad40bb4e4))
* **nav:** consolidate History/Stats/Activity under shared tab nav ([05e3cf9](https://github.com/jamiebclark/screened/commit/05e3cf90e5b8a86f8c519cc2d863b0ad770d1b6e))
* **nav:** replace Search nav link with icon button and modal ([91c312e](https://github.com/jamiebclark/screened/commit/91c312e08562f3fc39c429d147ddafe87fc8c582))
* **pick:** add Watch Party button to result cards and icon to shortlist ([498a1ab](https://github.com/jamiebclark/screened/commit/498a1ab10b7aa3fa754031a88e9b251e37b15217))
* **watch-parties:** replace one-time ICS download with live calendar subscription ([022979f](https://github.com/jamiebclark/screened/commit/022979f282fcc5caf331020ab636f826446cbd61))
* **watch-parties:** replace subscribe popover with DateWithHistoryLink; move subscribe to history ([a24e5e6](https://github.com/jamiebclark/screened/commit/a24e5e6a02b8c648c7bee1284743c5d0ec41e523))

## [1.31.0](https://github.com/jamiebclark/screened/compare/v1.30.0...v1.31.0) (2026-05-03)

### Features

* **api:** add watch-party CRUD, respond, confirm, ICS, and cron routes ([c83984c](https://github.com/jamiebclark/screened/commit/c83984cc3554ac68eeafc0f8b87c76957491e012))
* **calendar:** add ICS feed generation and token management API ([9a56c3b](https://github.com/jamiebclark/screened/commit/9a56c3b47a9635bb200d368b8f22d94dd4a5d2d5))
* **schema:** add WatchParty and WatchPartyInvite models ([0b449f1](https://github.com/jamiebclark/screened/commit/0b449f1852a85325fc7a087e1506d219c6ebb777))
* **settings:** add calendar feed settings page ([013234c](https://github.com/jamiebclark/screened/commit/013234c9a34b154845b5d6647a95d0bf9b06ce75))
* **ui:** add Watch Parties list and detail pages with CreateWatchPartyDialog ([9519d38](https://github.com/jamiebclark/screened/commit/9519d38b86d08b40c5872749a3971744a0a8114f))
* **ui:** wire Watch Party entry points into title pages, Picker, and nav ([db02ec7](https://github.com/jamiebclark/screened/commit/db02ec764ad08bb6028ce4949300c7ae2c5ff08b))
* **watch-party:** add lib module and notification-types mirror ([3e8f3bc](https://github.com/jamiebclark/screened/commit/3e8f3bc26c13fbf63d1afcf22fd506a9404e2d96))

## [1.30.0](https://github.com/jamiebclark/screened/compare/v1.29.1...v1.30.0) (2026-05-03)

### Features

* **seo:** add page titles to all routes via metadata template ([c7dc26b](https://github.com/jamiebclark/screened/commit/c7dc26b8265acd7dabd52395c63edc44a634b3f9))

## [1.29.1](https://github.com/jamiebclark/screened/compare/v1.29.0...v1.29.1) (2026-05-03)

### Bug Fixes

* **watchlist:** use $queryRaw for upcoming section to avoid stale client cache ([3ccb135](https://github.com/jamiebclark/screened/commit/3ccb1358c9f78972d3838c984150148571caf8da))

## [1.29.0](https://github.com/jamiebclark/screened/compare/v1.28.0...v1.29.0) (2026-05-03)

### Features

* **media:** populate releaseDate in all MediaItem create paths ([c8606ea](https://github.com/jamiebclark/screened/commit/c8606ea5951429468d13571f616a23f9a3e6b165))
* **watchlist:** add releasing-soon section ([15bfe3c](https://github.com/jamiebclark/screened/commit/15bfe3cc3ef8da6e9731d6ad81eece6324b3eaef))

## [1.28.0](https://github.com/jamiebclark/screened/compare/v1.27.0...v1.28.0) (2026-05-03)

### Features

* **watchlist:** add WatchlistClient with sort/filter controls ([8afe36f](https://github.com/jamiebclark/screened/commit/8afe36f08d7ea8ce45f2289888e708a839f3db3d))
* **watchlist:** wire server-side sort via searchParams ([cd478a6](https://github.com/jamiebclark/screened/commit/cd478a61f66e3a1b7173101f420ca8d05bf3a6f4))

## [1.27.0](https://github.com/jamiebclark/screened/compare/v1.26.2...v1.27.0) (2026-05-03)

### Features

* **stats:** add /stats page with CSS bar charts ([7dc0b85](https://github.com/jamiebclark/screened/commit/7dc0b85e919967b808a96808dc6e5ec6e305998c))
* **stats:** add getUserStats query lib ([cfb51ed](https://github.com/jamiebclark/screened/commit/cfb51ed523767fc3f0b11fcaccf322c97f615362))

## [1.26.2](https://github.com/jamiebclark/screened/compare/v1.26.1...v1.26.2) (2026-05-03)

### Bug Fixes

* **plex:** prefer non-local server connections for cloud/Docker syncs ([42ad3b7](https://github.com/jamiebclark/screened/commit/42ad3b7b744f1dbd1dc181fd450506645bbc75c5))

## [1.26.1](https://github.com/jamiebclark/screened/compare/v1.26.0...v1.26.1) (2026-05-03)

### Bug Fixes

* **trakt:** remove invalid configured prop from TraktSettings in onboarding ([632f44f](https://github.com/jamiebclark/screened/commit/632f44f9013298d74771e5e6da9372c6e6991c96))

## [1.26.0](https://github.com/jamiebclark/screened/compare/v1.25.0...v1.26.0) (2026-05-03)

### Features

* **auth:** hide email/password form when pinId param is present ([4be8e06](https://github.com/jamiebclark/screened/commit/4be8e06c252106ba67f638d7212720d8d8827043))
* **icons:** adds icons at various sizes ([77d0d47](https://github.com/jamiebclark/screened/commit/77d0d47308b8912318f07e119aab132f9a2d9564))
* **trakt:** hide settings when TRAKT_CLIENT_ID/SECRET are not set ([5129e2f](https://github.com/jamiebclark/screened/commit/5129e2f1a3ae082f7d9c500e05d4b96e5ade165e))

### Bug Fixes

* **trakt:** add User-Agent header to all Trakt API requests ([7f07f58](https://github.com/jamiebclark/screened/commit/7f07f58276d0db8b8d807dcfe03a80faeeffd2bb))

## [1.25.0](https://github.com/jamiebclark/screened/compare/v1.24.1...v1.25.0) (2026-05-03)

### Features

* **admin:** show per-user failure details on cron run rows ([a5ed011](https://github.com/jamiebclark/screened/commit/a5ed011f673f43012daf9766e498fdde928e8b49))

## [1.24.1](https://github.com/jamiebclark/screened/compare/v1.24.0...v1.24.1) (2026-05-03)

### Bug Fixes

* **admin:** refresh cron status page after successful job trigger ([77547cc](https://github.com/jamiebclark/screened/commit/77547cc841eddf0741519e2f5f2664ffe5ef3911))

## [1.24.0](https://github.com/jamiebclark/screened/compare/v1.23.1...v1.24.0) (2026-05-03)

### Features

* **admin:** add error logs page ([be531c1](https://github.com/jamiebclark/screened/commit/be531c14a7d40527b5f61115acdee09a815810ad))
* **logger:** add in-memory ring buffer with console capture ([867e606](https://github.com/jamiebclark/screened/commit/867e6062ef7383b3444c67a0e8e4de2a26bbbc98))

## [1.23.1](https://github.com/jamiebclark/screened/compare/v1.23.0...v1.23.1) (2026-05-03)

### Bug Fixes

* **admin:** fix cron trigger self-fetch failure and surface error messages ([dbdb7ff](https://github.com/jamiebclark/screened/commit/dbdb7ff53bea8f46bd3b55fdde08987d9a6b399d))

## [1.23.0](https://github.com/jamiebclark/screened/compare/v1.22.0...v1.23.0) (2026-05-03)

### Features

* **admin:** add manual trigger button to cron status page ([94f90e4](https://github.com/jamiebclark/screened/commit/94f90e40617e383d5973f76e4db10cdb4f62c93d))
* **admin:** add service health badges and next-run estimates to cron status ([5f65416](https://github.com/jamiebclark/screened/commit/5f65416ae6e4731bbdd5c65292dcd268ddee5c5d))

## [1.22.0](https://github.com/jamiebclark/screened/compare/v1.21.0...v1.22.0) (2026-05-03)

### Features

* **admin:** add breadcrumbs to admin layout ([635486e](https://github.com/jamiebclark/screened/commit/635486e4868364a7aaf94b897b3fff1ad6a1fd11))

## [1.21.0](https://github.com/jamiebclark/screened/compare/v1.20.0...v1.21.0) (2026-05-03)

### Features

* **admin:** add admin index page and nav dropdown link ([b877fbc](https://github.com/jamiebclark/screened/commit/b877fbcf0054010e76351a43850288808136e1a7))
* **admin:** add cron status page and instrument sync routes ([433c96b](https://github.com/jamiebclark/screened/commit/433c96b0cc948a48ac94ed9e0e7f3887573cd2e4))
* **admin:** add users list page with delete ([7e18276](https://github.com/jamiebclark/screened/commit/7e18276ef8967bd924c946f34434c1f785bc7549))
* **admin:** link user names to their public profile ([0daa580](https://github.com/jamiebclark/screened/commit/0daa580806c51065530fb72ced48d294e4c81778))
* **cron:** add CronRun model to record sync job executions ([26dddec](https://github.com/jamiebclark/screened/commit/26dddec9e402de1b8c4c5331ef83524594a3c210))

### Bug Fixes

* **prisma:** include cronRun in dev HMR staleness check ([7f2a894](https://github.com/jamiebclark/screened/commit/7f2a894b60b37fe743a6272545283bf5f7240cbb))

## [1.20.0](https://github.com/jamiebclark/screened/compare/v1.19.0...v1.20.0) (2026-05-03)

### Features

* **onboarding:** add all integrations with core/accordion layout ([d1deedf](https://github.com/jamiebclark/screened/commit/d1deedf45356396a99cb5f021cf4c68f6c361b94))

### Bug Fixes

* **settings:** add Jellyfin, Trakt, and Overseerr to integrations nav ([2657a7b](https://github.com/jamiebclark/screened/commit/2657a7b935253f419da982606b8cff22e94928ab))
* **tmdb:** normalize array fields at the fetch boundary ([732c257](https://github.com/jamiebclark/screened/commit/732c2577dbd0c6d5bdd006aa3b06a4173ff2679a))

## [1.19.0](https://github.com/jamiebclark/screened/compare/v1.18.1...v1.19.0) (2026-05-03)

### Features

* **cron:** switch to curlimages/curl and add jellyfin/tautulli/trakt cron containers ([e0abe0d](https://github.com/jamiebclark/screened/commit/e0abe0d8815574c92a6d45bc8ebcc90b2612d6ad))

### Bug Fixes

* **cron:** remove runtime apk install from cron scripts ([eaa749d](https://github.com/jamiebclark/screened/commit/eaa749d5a68d07c78571be5a0c418f415353006c))

## [1.18.1](https://github.com/jamiebclark/screened/compare/v1.18.0...v1.18.1) (2026-05-02)

### Bug Fixes

* **jellyfin:** guard against missing Items in paginated history response ([b93ba4e](https://github.com/jamiebclark/screened/commit/b93ba4e0902a1c0f4e767c8029e2690aebbf602e))
* **tautulli:** guard against null guids and missing response data ([ca9f3c2](https://github.com/jamiebclark/screened/commit/ca9f3c2044afeff7b656557ee26754f85cb7326f))
* **trakt:** guard against non-array response in history fetches ([d18d734](https://github.com/jamiebclark/screened/commit/d18d734086350632d7c7d4105485352ee707bdec))

## [1.18.0](https://github.com/jamiebclark/screened/compare/v1.17.0...v1.18.0) (2026-05-02)

### Features

* **jellyfin,trakt,overseerr:** add API routes and cron endpoints ([72a479b](https://github.com/jamiebclark/screened/commit/72a479ba18357fb83c9572f915cd8e08edf323ce))
* **jellyfin,trakt,overseerr:** add integration lib and sync logic ([b020c1d](https://github.com/jamiebclark/screened/commit/b020c1dd85e8f1ff63dd8e6e8de0def26afec867))
* **schema:** add JellyfinConnection, TraktConnection, OverseerrConnection models ([a1c20cf](https://github.com/jamiebclark/screened/commit/a1c20cfaabf7ba65af05c81ea8daa49e4dd061a5))
* **settings:** add brand icons to integration cards and nav ([d992510](https://github.com/jamiebclark/screened/commit/d992510baa63c4a0453cee4d7da0d92edd47dca1))
* **settings:** add Jellyfin, Trakt, and Overseerr settings pages ([2f54874](https://github.com/jamiebclark/screened/commit/2f54874ef4c6ceda35ad43244c04a68d322011b3))
* **streaming:** show watch provider availability on movie and TV pages ([c823817](https://github.com/jamiebclark/screened/commit/c823817df55eab39a8cff0d2b8228cee32d98cd6))
* **watch-history:** extend scopes and import counts for Jellyfin and Trakt ([a8e83ba](https://github.com/jamiebclark/screened/commit/a8e83bad996a794d2229b550331bd4fdf99ecee6))

### Bug Fixes

* **about:** source GitHub repo URL from package.json instead of CHANGELOG.md ([0ab75d8](https://github.com/jamiebclark/screened/commit/0ab75d834d8e943a0b66d02d05716779e5e3955c))

## [1.17.0](https://github.com/jamiebclark/screened/compare/v1.16.0...v1.17.0) (2026-05-02)

### Features

* **schema:** add TautulliConnection model and TAUTULLI watch entry source ([c9616d5](https://github.com/jamiebclark/screened/commit/c9616d59977001d1c5bd7e213c562e05b581a212))
* **tautulli:** add API client, sync function, and watch-entry merge helper ([b0ed57b](https://github.com/jamiebclark/screened/commit/b0ed57b7b4ab6edf9dcea40e6be03fcae0fb2aa0))
* **tautulli:** add link, sync, and cron API routes ([4b30966](https://github.com/jamiebclark/screened/commit/4b3096695f9d8f592a3cf6f7a33821ea083bbef2))
* **tautulli:** add settings page and watch history source rows ([7226a4d](https://github.com/jamiebclark/screened/commit/7226a4da67584e83ec64c04c4037e2816fc855af))

## [1.16.0](https://github.com/jamiebclark/screened/compare/v1.15.1...v1.16.0) (2026-05-02)

### Features

* **cron:** add Letterboxd auto-sync container and update env docs ([c1b0198](https://github.com/jamiebclark/screened/commit/c1b01984eb08ce45919106a2eb02b2ddaff26e1c))
* **cron:** log start-of-run timestamp and user count for both sync jobs ([2e8231c](https://github.com/jamiebclark/screened/commit/2e8231cda5b5e4ad65565f8ff6424c1d950fe405))
* **lists:** show which lists contain a title on movie and TV pages ([d43c0a8](https://github.com/jamiebclark/screened/commit/d43c0a84502d2a5b81c9c45c767b36967a8553b9))
* **lists:** show which members have watched or are watching each item ([dc65003](https://github.com/jamiebclark/screened/commit/dc65003aa961520fad9a24d221962a779078381d))

### Bug Fixes

* **discord:** add embed title so url renders as a clickable hyperlink ([994f06b](https://github.com/jamiebclark/screened/commit/994f06bb657fe4c346bc9568c5dd79d029872db4))
* **lists:** revalidatePath after add/remove so refresh is instant ([d32b4ca](https://github.com/jamiebclark/screened/commit/d32b4ca0012f0925ffaf16494b3a0231fc7150b2))

### Performance Improvements

* **plex:** persist library index cache to DB for fast page loads ([0a86c0f](https://github.com/jamiebclark/screened/commit/0a86c0faff8f2298d67dfe131df4911b371411f1))

## [1.15.1](https://github.com/jamiebclark/screened/compare/v1.15.0...v1.15.1) (2026-05-02)

### Performance Improvements

* **docker:** replace full node_modules copy with targeted prisma install ([5db8f3a](https://github.com/jamiebclark/screened/commit/5db8f3a9beb4fada53c5c5cb71bf57212230f7d3))

## [1.15.0](https://github.com/jamiebclark/screened/compare/v1.14.3...v1.15.0) (2026-05-02)

### Features

* **lists:** add integrations sidebar with Radarr copy URL ([9842b97](https://github.com/jamiebclark/screened/commit/9842b9720288d9192b6fea5d016a8919616c89b4))

### Bug Fixes

* **lists:** fix Discord channel select resetting after pick ([13ba190](https://github.com/jamiebclark/screened/commit/13ba190e0923a1d77c97975ec41ce47c506e75bc))

## [1.14.3](https://github.com/jamiebclark/screened/compare/v1.14.2...v1.14.3) (2026-05-02)

### Bug Fixes

* **picker:** restore missing NextRequest import in sessions and presets routes ([b26d67c](https://github.com/jamiebclark/screened/commit/b26d67cb46a9eaca840e9cc0f5e1747622a8baac))

## [1.14.2](https://github.com/jamiebclark/screened/compare/v1.14.1...v1.14.2) (2026-05-02)

### Bug Fixes

* **discord:** bypass auth middleware for interactions endpoint ([9f538fe](https://github.com/jamiebclark/screened/commit/9f538fe9df92303bcd55a8bd83cbcba00eed6f12))

## [1.14.1](https://github.com/jamiebclark/screened/compare/v1.14.0...v1.14.1) (2026-05-02)

### Bug Fixes

* **lint:** remove unused NextRequest param from no-body route handlers ([1fe6040](https://github.com/jamiebclark/screened/commit/1fe60402aaa3e9bcb3fd0701a250769f9ffcac54))

## [1.14.0](https://github.com/jamiebclark/screened/compare/v1.13.0...v1.14.0) (2026-05-02)

### Features

* **activity:** add /activity feed page and loading skeleton ([73e5b5b](https://github.com/jamiebclark/screened/commit/73e5b5be531c0134a0eb4a9df782841807c69cbf))
* **discord:** add core discord library ([634874b](https://github.com/jamiebclark/screened/commit/634874b8e16dd6e08184ae409b9c8f5e87e48015))
* **discord:** add discord settings page ([4c89a27](https://github.com/jamiebclark/screened/commit/4c89a276210e97bd95f67a1950bac9e29ab7841f))
* **discord:** add Discord unlink endpoint ([21ed659](https://github.com/jamiebclark/screened/commit/21ed659e55290e5a9d79dd23b06458c9f27952a5))
* **discord:** add interactions endpoint for slash commands ([407ca59](https://github.com/jamiebclark/screened/commit/407ca59157621910a313cd16c7602140b06e2baf))
* **discord:** add OAuth2 callback and token exchange ([bf0e23b](https://github.com/jamiebclark/screened/commit/bf0e23b7ac4e0a031fbfb2f899660414170921da))
* **discord:** add slash command registration script ([2a2b0f8](https://github.com/jamiebclark/screened/commit/2a2b0f8cd76d22858a723ac341c51845325fa571))
* **discord:** add webhook URL field to list settings ([69c9aaf](https://github.com/jamiebclark/screened/commit/69c9aaf675eb7698017a192a53567fa10b153bc2))
* **discord:** fire webhook notifications on watch and list events ([0e9d4cb](https://github.com/jamiebclark/screened/commit/0e9d4cb0822ef320c378622a7108234a1dfdf123))
* **discord:** replace manual webhook URL with managed channel picker ([3d1981f](https://github.com/jamiebclark/screened/commit/3d1981fc29a7aefa3ec1bbdefdcfe96ff10d88c7))
* **discord:** send DMs when a friend watches a watchlisted title ([227f687](https://github.com/jamiebclark/screened/commit/227f687827831cb1eafa3d3d9b333df30d72996e))
* **nav:** add Activity link and update notification menu ([ce42aab](https://github.com/jamiebclark/screened/commit/ce42aab3a7e8c8035787ade2913f46dbc60549d3))
* **notifications:** trigger watchlist notifications on manual watch actions ([8574aea](https://github.com/jamiebclark/screened/commit/8574aea1503c8cfb46a0d775ec12c7318ae3d108))
* **picker:** add /pick/history page and preset selector on pick page ([74e2d0d](https://github.com/jamiebclark/screened/commit/74e2d0dfcb5a9508b762ace843c215c706a51fb3))
* **picker:** add session save and room preset API routes ([280d1df](https://github.com/jamiebclark/screened/commit/280d1df61c74db7817edea69e347d1d43169a1ff))
* **picker:** add session save, presets, and history nav to pick session ([9c53a35](https://github.com/jamiebclark/screened/commit/9c53a358d7361b75ba3642bdfb14f7dd7bfa9bf8))
* **picker:** add shortlist and votes fields to room state ([e1972ea](https://github.com/jamiebclark/screened/commit/e1972ea72178f3ef08b6aa76031e246873405743))
* **picker:** add shortlist voting panel to picker results ([b3b930d](https://github.com/jamiebclark/screened/commit/b3b930dee5c17d7fded7b9773c40ce6ac670db71))
* **profile:** add recent activity strip and mutual friends count ([2017b3e](https://github.com/jamiebclark/screened/commit/2017b3eeaa912a7998db7be499c0fde0eda7d592))
* **schema:** add FRIEND_WATCHED_YOUR_WATCHLIST notification type ([261c72b](https://github.com/jamiebclark/screened/commit/261c72b998d257f1a615136b033e49eba1171c64))
* **schema:** add PickerSession and PickerRoomPreset models ([9ce6e51](https://github.com/jamiebclark/screened/commit/9ce6e517c1a71884425d2eafde798a7eccde09a5))
* **social:** add activity feed query, watch notification helper, and mutual friends count ([5d6c224](https://github.com/jamiebclark/screened/commit/5d6c2247877516f90d808deb38e5424995c19a00))

### Bug Fixes

* **discord:** rename unused param in link route ([707214f](https://github.com/jamiebclark/screened/commit/707214fa36128ede886cbf0fcb0d05af69d5b0fb))
* **discord:** suppress unused-param warning in unlink route ([5d65ded](https://github.com/jamiebclark/screened/commit/5d65dedca8690364b1afa25f47b3da4ca1b0d927))
* **onboarding:** remove broken Picker link that redirected back to onboarding ([fcfc97d](https://github.com/jamiebclark/screened/commit/fcfc97ddeaae76b51fe2afcb88f3c70f0b1d9180))
* **onboarding:** remove informational Picker step with no actionable content ([864124f](https://github.com/jamiebclark/screened/commit/864124f926d0a5958d44743ec8ad746da2d31285))

## [1.13.0](https://github.com/jamiebclark/screened/compare/v1.12.0...v1.13.0) (2026-04-27)

### Features

* **detail:** add 'You might also like' related titles section ([5e5a556](https://github.com/jamiebclark/screened/commit/5e5a55647a84da25b283d4465bc65461fad99b8f))
* **onboarding:** surface Picker feature in onboarding and login page ([3dd89f1](https://github.com/jamiebclark/screened/commit/3dd89f1760153da1cf8ba0fc07317f5b1d2bd48a))
* **toast:** add Radix-based toast system and wire Toaster into app layout ([258a69a](https://github.com/jamiebclark/screened/commit/258a69a6851a489af04f25d57bc8466a5eab9336))
* **ux:** actionable CTAs on empty tracking and history pages ([c4e6eb9](https://github.com/jamiebclark/screened/commit/c4e6eb9f1acf5b4848ebb5e54fa465c452934ceb))
* **ux:** add route-level loading.tsx skeletons for poster-grid pages ([da22e37](https://github.com/jamiebclark/screened/commit/da22e3738e3aa5b96c7b158701bff85289828a2d))

## [1.12.0](https://github.com/jamiebclark/screened/compare/v1.11.0...v1.12.0) (2026-04-27)

### Features

* **pick:** add score fingerprint and filter attribution to room state ([c18128f](https://github.com/jamiebclark/screened/commit/c18128f5734c07eb6ac10da2d0283bd5de5eb8b1))
* **pick:** hydrate score fingerprint on room load and sync ([29d0f27](https://github.com/jamiebclark/screened/commit/29d0f2711d749f3e95a9e5508768b08fdf0255c9))
* **pick:** picker filters layout, refine hint, attribution, session log ([2cf047c](https://github.com/jamiebclark/screened/commit/2cf047c594b3415fa03e06d1920a6f2db1335b8b))

### Bug Fixes

* **pick:** prefer veto copy when dismissing a ranked result ([b17a7d1](https://github.com/jamiebclark/screened/commit/b17a7d15bae9282d8bc2711994816f7cf513959b))

## [1.11.0](https://github.com/jamiebclark/screened/compare/v1.10.1...v1.11.0) (2026-04-27)

### Features

* **about:** add site footer and /about routes ([f9b360e](https://github.com/jamiebclark/screened/commit/f9b360e34eb88f2eaf928b2fdbfbb30196a189b6))
* signup invites, omdb ratings, and app updates ([a84988e](https://github.com/jamiebclark/screened/commit/a84988e0d3c5c3022e49c187faf2d55383c86cb9))
* tv episode logging, merged watch history, and rating links ([e095348](https://github.com/jamiebclark/screened/commit/e09534831daad355771f27a33b0594d4932e5e67))

### Bug Fixes

* **lint:** satisfy eslint and enforce lint in ci ([3dc48df](https://github.com/jamiebclark/screened/commit/3dc48df0052408c06b87f5f6eb4354eee75380fd))

## [1.10.1](https://github.com/jamiebclark/screened/compare/v1.10.0...v1.10.1) (2026-04-26)

### Bug Fixes

* **status:** use last episode time for tv watch log on watched ([9438ced](https://github.com/jamiebclark/screened/commit/9438ced009f0b87b807f94764d44ce5fd36706dc))

## [1.10.0](https://github.com/jamiebclark/screened/compare/v1.9.0...v1.10.0) (2026-04-26)

### Features

* **lists:** show watched list items in a separate section ([2895a31](https://github.com/jamiebclark/screened/commit/2895a3168872674f8348029a6d16297c1bb5dd82))
* **watch:** log a viewing for friends with optional withUserIds ([3d340c0](https://github.com/jamiebclark/screened/commit/3d340c00c49b0ef1903f86207b8ef81d30c1edb3))
* **watch:** merge same-day watch entries for letterboxd and plex sync ([6464a7e](https://github.com/jamiebclark/screened/commit/6464a7e7102f41b71f965979ea31e6a4ed8d2e5b))

## [1.9.0](https://github.com/jamiebclark/screened/compare/v1.8.0...v1.9.0) (2026-04-26)

### Features

* **app:** add first-login onboarding and gate app area ([f6ba059](https://github.com/jamiebclark/screened/commit/f6ba059d5de5b31c1343db449f3ffd70270e5f9b))
* **components:** allow optional search query on media card links ([a3698a4](https://github.com/jamiebclark/screened/commit/a3698a457594bc375f87372498f222a6d296f0ea))
* **db:** add user onboarding completed at ([d0afef9](https://github.com/jamiebclark/screened/commit/d0afef9e4c09788991eeb35c9e0dbf9f5233e2f7))
* **friendship:** add listFriendUserIds helper ([2d6e261](https://github.com/jamiebclark/screened/commit/2d6e26131ca5b965339bfda7f04121dee379cc0e))
* **history:** add calendar pages and friend-aware watch queries ([f83ae4f](https://github.com/jamiebclark/screened/commit/f83ae4fe336c4991d3cb24fc34cbd46eadbf8027))
* **lists:** hide already-watched titles for the signed-in viewer ([40ee634](https://github.com/jamiebclark/screened/commit/40ee634ba36953ce7cf236d39b1002e94e6f93c4))
* **search:** preserve watched date from calendar in query and nav ([ee339ac](https://github.com/jamiebclark/screened/commit/ee339ac34d3c047d62b3012c553bfcebeb879248))
* **titles:** catalog links by poster and shared watch history ([d3dd1ea](https://github.com/jamiebclark/screened/commit/d3dd1eaef5575c38dac81bfa932364b9db5652b7))
* **ui:** add plus jakarta sans and base heading tracking ([0c7c25a](https://github.com/jamiebclark/screened/commit/0c7c25a751c18d4b18f7e518a665a4dcf6ddab16))

### Bug Fixes

* **auth:** pass request pathname on continued requests ([4abacae](https://github.com/jamiebclark/screened/commit/4abacaef98f00cc94e22cebc424aa8930c37c61f))
* **tracking:** order home strip and lists by watch time and add time ([eb7a7c1](https://github.com/jamiebclark/screened/commit/eb7a7c1de93adca7f61191573c73b52e44f1897d))

## [1.8.0](https://github.com/jamiebclark/screened/compare/v1.7.0...v1.8.0) (2026-04-26)

### Features

* **letterboxd:** store diary url on watch entries from rss ([3638837](https://github.com/jamiebclark/screened/commit/3638837adc61f0de9e084040ffbefb84886c176b))
* **movies:** title chrome site context and outbound catalog links ([252b857](https://github.com/jamiebclark/screened/commit/252b857184644d3491d7f8520c671d65592c3542))
* **pick:** genre include and exclude in hard filters ([ab82f66](https://github.com/jamiebclark/screened/commit/ab82f663df3f9739c2674c562a75b5e8215cf0c3))

### Bug Fixes

* **ui:** scrollable main region in app shell ([8d85b56](https://github.com/jamiebclark/screened/commit/8d85b567e441cfba79fa7ba3cba20d9a2285fbc2))

### Performance Improvements

* **plex:** cache library tmdb index with ttl and single flight ([7bccdc6](https://github.com/jamiebclark/screened/commit/7bccdc60c82c70fc6c7d22514309d70bf3e43f34))

## [1.7.0](https://github.com/jamiebclark/screened/compare/v1.6.1...v1.7.0) (2026-04-26)

### Features

* **pick:** live session activity feed with sourceUserId on room sync ([417a764](https://github.com/jamiebclark/screened/commit/417a76416a8bf39147b72b5efb47151b4d72baa4))
* **profile:** privacy settings, friend requests, and notifications ([1c8d9da](https://github.com/jamiebclark/screened/commit/1c8d9da8ba20c3c0af7a700de4750443d5c9a742))
* **settings:** add about page with version and latest changelog ([4af955f](https://github.com/jamiebclark/screened/commit/4af955f6e7f0377e8e99e962b159bd1ae7da98e9))

### Bug Fixes

* **app:** add favicon.ico derived from brand icon ([b6f23a4](https://github.com/jamiebclark/screened/commit/b6f23a46d8d97f9b0dfb3a63b04db4a8b3af7f2d))

## [1.6.1](https://github.com/jamiebclark/screened/compare/v1.6.0...v1.6.1) (2026-04-26)

### Bug Fixes

* **ci:** generate Prisma barrel index after prisma generate ([ec76491](https://github.com/jamiebclark/screened/commit/ec7649176d02a857b86cb9514ec8ae03db160e42))

## [1.6.0](https://github.com/jamiebclark/screened/compare/v1.5.1...v1.6.0) (2026-04-26)

### Features

* **api:** batch fetch media statuses by tmdb ids ([0a29c3c](https://github.com/jamiebclark/screened/commit/0a29c3c1eb23d1dd11e0935b26b5faebce96e034))
* **pick:** show watch status, lists, and ratings on result cards ([4207131](https://github.com/jamiebclark/screened/commit/4207131522c4737b4440773aa12ec3faa90369f7))
* **ui:** use corner remove control on lists, watchlist, and watching ([0c2a49f](https://github.com/jamiebclark/screened/commit/0c2a49f28f57f9cfa3f8375c770c4be3cda6866a))

### Bug Fixes

* **ui:** sync watch status and ratings with server after mutations ([d25676c](https://github.com/jamiebclark/screened/commit/d25676c2789905b1bb780169b337541a14e96c2a))

## [1.5.1](https://github.com/jamiebclark/screened/compare/v1.5.0...v1.5.1) (2026-04-26)

### Bug Fixes

* **lint:** satisfy react-hooks set-state and ref rules ([e6597cf](https://github.com/jamiebclark/screened/commit/e6597cfb0227eee7e2e5127e11de4c5f2d51c088))

## [1.5.0](https://github.com/jamiebclark/screened/compare/v1.4.1...v1.5.0) (2026-04-26)

### Features

* **auth:** issue watchlist radarr token on sign-up and plex user link ([b815857](https://github.com/jamiebclark/screened/commit/b815857231fae84792a2f1590690fc00f83dd9c6))
* **auth:** validate post-login callback URL ([e70f055](https://github.com/jamiebclark/screened/commit/e70f055d318e56d020072d09987986a130ebf64b))
* **db:** add user watchlist radarr token ([a3d690e](https://github.com/jamiebclark/screened/commit/a3d690e5f66534856f323a69f88c1c7c6d2ef010))
* **db:** watch entry source and list access notifications schema ([25888ac](https://github.com/jamiebclark/screened/commit/25888ac876c6771d6fdb6ad3b76d8566b8f6c6cb))
* **lists:** private list access requests and notifications ([0a2566c](https://github.com/jamiebclark/screened/commit/0a2566cfc94761df4bb2c052ee059897eeb609c3))
* **pick:** add year range, vetoes, and sidebar layout ([42932d4](https://github.com/jamiebclark/screened/commit/42932d44889ecf483c546c48cf0e77e99519874c))
* **pick:** discovery and library scoring pipeline ([419b69e](https://github.com/jamiebclark/screened/commit/419b69eb9cdd8d300b3decd8d69f4b4efdd07f2e))
* **pick:** person tags, plex library option, and scoring session ([88c69aa](https://github.com/jamiebclark/screened/commit/88c69aa2693fd8a3714cf6b4d330f252dfcfc249))
* **plex:** add per-user library movie sets and intersection ([2636780](https://github.com/jamiebclark/screened/commit/2636780f589db61f46bdae399c1200504b299aa3))
* **radarr:** add watchlist export helpers and user watchlist apis ([d8a78da](https://github.com/jamiebclark/screened/commit/d8a78da24ba6c862067fe1a40ab104634a4b7d3f))
* **search:** add person search api ([384c78b](https://github.com/jamiebclark/screened/commit/384c78b41e73b698554dc127d57ace64b6d6ef24))
* **settings:** account profile API and JWT session sync ([752fd50](https://github.com/jamiebclark/screened/commit/752fd5020b396043283619db62fad39e2a65d7ed))
* **settings:** adjust settings home and nav ([41648b5](https://github.com/jamiebclark/screened/commit/41648b540934f91506216acf20e6ebd6f09752a1))
* **settings:** hub layout and subpage navigation ([e88b0b5](https://github.com/jamiebclark/screened/commit/e88b0b5db856c25ffe22ab72d8a1b501002a7750))
* **ui:** search-and-add on watch status pages ([e104b53](https://github.com/jamiebclark/screened/commit/e104b53195ee57c702625c56ffecb9aaacf103f6))
* **watch-history:** entry source, import scopes, and reset settings ([ca45c7b](https://github.com/jamiebclark/screened/commit/ca45c7bc6c48e26abb72a0de40754b75aa314681))
* **watchlist:** add radarr share to watchlist page ([0bb6ded](https://github.com/jamiebclark/screened/commit/0bb6dedc45eb5ab2e2b674d65b02bec60b456e98))

### Bug Fixes

* **discovery:** widen tmdb pool and match all movie directors ([cefe633](https://github.com/jamiebclark/screened/commit/cefe633cc862dd404e4039b06841566f24d09e64))
* **prisma:** recreate dev client after generate adds new delegates ([16b5dc3](https://github.com/jamiebclark/screened/commit/16b5dc33b1a1ce0fb87dbed6740d9612272f99d8))
* **ui:** refresh RSC after list invite and add to list ([355fc4d](https://github.com/jamiebclark/screened/commit/355fc4df18bfae41ab3b8a0070b637727d22aa07))
* **watch:** refresh page and log viewing when marking watched ([7f85ed2](https://github.com/jamiebclark/screened/commit/7f85ed2d02691d83fef38dc773a5fb98d9eb5140))

## [1.4.1](https://github.com/jamiebclark/screened/compare/v1.4.0...v1.4.1) (2026-04-26)

### Bug Fixes

* **db:** add migration for media metadata and picker models ([e314d09](https://github.com/jamiebclark/screened/commit/e314d09074eab51fff5239d1a9f8297a2f11a053))

## [1.4.0](https://github.com/jamiebclark/screened/compare/v1.3.0...v1.4.0) (2026-04-26)

### Features

* **app:** add film icon favicon matching brand logo ([1a12991](https://github.com/jamiebclark/screened/commit/1a12991fb8085ebb8d1945b1f1953db34a80bc75))

## [1.3.0](https://github.com/jamiebclark/screened/compare/v1.2.0...v1.3.0) (2026-04-26)

### Features

* **app:** add picker, library and settings pages, and watch history UI ([7134a01](https://github.com/jamiebclark/screened/commit/7134a0182b79a2f0df37015fd77cb4166ea222c0))
* **db:** add watch entries, letterboxd, and user preferences ([a07d9b1](https://github.com/jamiebclark/screened/commit/a07d9b1490ad9d1f76de0741e93ddbf577fe1ecd))
* **embedding:** add openai text embedding helper ([5fc7477](https://github.com/jamiebclark/screened/commit/5fc7477922fb1647a1c75fa898cf8e4892adce14))
* **letterboxd:** add sync service, link API, and cron route ([a0d9709](https://github.com/jamiebclark/screened/commit/a0d97098bbd51bf87fdd55b345e6ca4ee637bdfe))
* **media:** enrich media on status change and add watch entry APIs ([b73cdee](https://github.com/jamiebclark/screened/commit/b73cdeed675e8b7cd09d40cee9f3f242cbc26b87))
* **picker:** add room APIs, preferences, and session support routes ([c64e0d0](https://github.com/jamiebclark/screened/commit/c64e0d054f80dbfb6d08eabd824149d854c99a1c))
* **plex:** create watch entries when syncing plex history ([9694ebb](https://github.com/jamiebclark/screened/commit/9694ebb077b7ac57d1eaf60f10fb568c81ac8297))
* **tmdb:** add cast, director, and keyword fetchers ([dc0a2a0](https://github.com/jamiebclark/screened/commit/dc0a2a08edf5f429270646d7109ed7179c36eabf))

### Bug Fixes

* **plex:** request guids in watched library fetches ([c736600](https://github.com/jamiebclark/screened/commit/c736600f79a0eb30b7eed3937f03a4f70bffc218))

## [1.2.0](https://github.com/jamiebclark/screened/compare/v1.1.0...v1.2.0) (2026-04-26)

### Features

* add watch history page and fix homepage ordering ([f9fadf8](https://github.com/jamiebclark/screened/commit/f9fadf8c849f27c265918c95448bc2c4f9950c07))

## [1.1.0](https://github.com/jamiebclark/screened/compare/v1.0.4...v1.1.0) (2026-04-26)

### Features

* **watch-log:** add editable watch date, time, and markdown review ([fa6678e](https://github.com/jamiebclark/screened/commit/fa6678ecfdb1554114a226ad08be521f078403f1))

## [1.0.4](https://github.com/jamiebclark/screened/compare/v1.0.3...v1.0.4) (2026-04-26)

### Bug Fixes

* always show both movie and TV counts in Plex sync result ([6dd9e6f](https://github.com/jamiebclark/screened/commit/6dd9e6f7918b244ef31ff43f6982efd3e791f007))

## [1.0.3](https://github.com/jamiebclark/screened/compare/v1.0.2...v1.0.3) (2026-04-26)

### Bug Fixes

* **ci:** ensure docker build triggers by writing version to package.json ([4181b25](https://github.com/jamiebclark/screened/commit/4181b257e3141e16a91b6224f8fce338c5e10621))

## [1.0.2](https://github.com/jamiebclark/screened/compare/v1.0.1...v1.0.2) (2026-04-26)

### Bug Fixes

* **episodes:** auto-create TV media item when marking episodes without prior status ([9e7e49a](https://github.com/jamiebclark/screened/commit/9e7e49adee90c3d986fc6aa95e965d065c53ff81))

## [1.0.1](https://github.com/jamiebclark/screened/compare/v1.0.0...v1.0.1) (2026-04-25)

### Bug Fixes

* **plex:** use api/v2/resources endpoint and direct server URI ([19c0890](https://github.com/jamiebclark/screened/commit/19c08904b412abaf83cc14e16b275fd05a4484f2))
* **test:** remove unused register import from auth spec after helper refactor ([507d692](https://github.com/jamiebclark/screened/commit/507d692f9d10c3a328f56f51accb25d3a446ad0c))

## 1.0.0 (2026-04-25)

### Features

* add Docker Hub CI/CD and Plex sign-in ([558cb25](https://github.com/jamiebclark/screened/commit/558cb25044a584552cb2b50f6c714b1b51297227))
