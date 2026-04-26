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
