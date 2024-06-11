# NodeJS Version of [papyrus](https://github.com/PurpurMC/papyrus)

## Installation

```sh
git clone https://github.com/0x7d8/papyrus-node.git
cd papyrus-node

# make sure nodejs 20+ is installed
npm i -g pnpm
pnpm i
pnpm build
pnpm kit migrate # migrates the sqlite database

cp .env.example .env # edit this file to your needs
```

## Start

```sh
./start.sh
```
