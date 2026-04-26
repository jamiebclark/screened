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
