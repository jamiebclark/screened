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
