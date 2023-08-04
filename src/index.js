#!/usr/bin/env node

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import fetch from 'node-fetch';
import { ethers } from 'ethers';
import LootCardABI from '../abi/LootCardABI.js';

const LOOT_CARD_ADDRESS = '0x39F8166484486c3b72C5c58c468A016D036E1a02';

const configPath = path.join(os.homedir(), '.wallet');
if (!fs.existsSync(configPath)) {
    console.log('config file missing, please place it at:', configPath);
    process.exit();
}
const config = JSON.parse(fs.readFileSync(configPath));

const provider = new ethers.providers.AlchemyProvider('homestead', config.mainnet_alchemy_key);
const lootCardContract = new ethers.Contract(LOOT_CARD_ADDRESS, LootCardABI, provider);

const LOOT_CARD_SAP = {
    1: 3, // Hivver
    2: 2, // Blybold
    3: 1, // Dozegrass
    4: 1, // Scableaf
    5: 9, // Skrit
    6: 1, // Juicebox
    7: 539, // Rare Skull
    8: 539, // Linno Beetle
    9: 3, // Ommonite
    10: 539, // Augurbox
    11: 9, // Pelgrejo
    12: 14, // Ranch Milk
    13: 8, // Brember
    14: 1, // Astersilk
    15: 1, // Yum Nubs
    16: 1, // Ferqun
    17: 1, // Gastropod
    18: 1, // Ivory Tar
    19: 4, // Flux
    20: 6, // Murk Ring
    21: 6, // SUIT COAG
}

async function getLootCardBalance(address, tokenId) {
    return Promise.all([
        lootCardContract.balanceOf(address, tokenId).then(bn => bn.toNumber()),
        fetch(`https://omniscient.fringedrifters.com/card/api/${tokenId}.json`).then(r => r.json()),
    ]).then(([ balance, metadata ]) => {
        return {
            tokenId,
            name: metadata.name,
            balance,
            sap: (LOOT_CARD_SAP[tokenId] || 0) * balance,
        };
    })
}

async function allLootCardBalances(address) {
    const tokenIds = Object.keys(LOOT_CARD_SAP);
    const list = [];
    for (let i=0; i < tokenIds.length; i++) {
        const row = await getLootCardBalance(address, tokenIds[i]);
        list.push(row);
    }
    return list;
}

async function main() {
    const address = process.argv.slice(2)[0];
    await allLootCardBalances(address).then(lootCards => {
        console.log(lootCards);
        console.log('SAP Cans from Loot Cards:', lootCards.map(r => r.sap).reduce((a, b) => a + b, 0));
    });
}

main()
.then(() => process.exit(0))
.catch(e => {
    console.error(e);
    process.exit(1);
})