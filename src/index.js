#!/usr/bin/env node

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import fetch from 'node-fetch';
import { ethers } from 'ethers';
import DrifterABI from '../abi/DrifterABI.js';
import LootCardABI from '../abi/LootCardABI.js';

const DRIFTER_ADDRESS = '0xe3B399AAb015D2C0D787ECAd40410D88f4f4cA50';
const LOOT_CARD_ADDRESS = '0x39F8166484486c3b72C5c58c468A016D036E1a02';

const configPath = path.join(os.homedir(), '.wallet');
if (!fs.existsSync(configPath)) {
    console.log('config file missing, please place it at:', configPath);
    process.exit();
}
const config = JSON.parse(fs.readFileSync(configPath));

const provider = new ethers.providers.AlchemyProvider('homestead', config.mainnet_alchemy_key);
const drifterContract = new ethers.Contract(DRIFTER_ADDRESS, DrifterABI, provider);
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
        return [
            {
                tokenId,
                name: metadata.name,
                balance,
                sap: (LOOT_CARD_SAP[tokenId] || 0) * balance,
            },
            {
                tokenId,
                name: metadata.name,
                balance,
                sap: (balance) > 0 ? (LOOT_CARD_SAP[tokenId] || 0) * (balance - 1) : 0,
            },
        ] ;
    })
}

async function allLootCardBalances(address) {
    const tokenIds = Object.keys(LOOT_CARD_SAP);
    const list = [];
    const list2 = [];
    for (let i=0; i < tokenIds.length; i++) {
        const [row, row2]  = await getLootCardBalance(address, tokenIds[i]);
        list.push(row);
        list2.push(row2);
    }
    return [list, list2];
}


function drifterBonus(balance) {
    if (balance >= 100) {
        return 130;
    } else if (balance >= 50) {
        return 60;
    } else if (balance >= 35) {
        return 38;
    } else if (balance >= 20) {
        return 20;
    } else if (balance >= 10) {
        return 9;
    } else if (balance >= 5) {
        return 4;
    } else if (balance >= 3) {
        return 2;
    } else {
        return 0;
    }
}

async function drifterBalance(address) {
    const balance = await drifterContract.balanceOf(address).then(b => b.toNumber());
    const bonus = drifterBonus(balance);
    return {
        numDrifters: balance,
        sap: (balance * 5) + bonus,
    };
}

async function main() {
    const address = process.argv.slice(2)[0];
    await Promise.all([
        allLootCardBalances(address),
        drifterBalance(address),
    ]).then(([[lootCards, lootCards2], { numDrifters, sap }]) => {
        console.log(lootCards);
        console.log(lootCards2);
        const lootCardSap = lootCards.map(r => r.sap).reduce((a, b) => a + b, 0);
        const lootCardSap2 = lootCards2.map(r => r.sap).reduce((a, b) => a + b, 0);
        console.log('SAP Cans from Loot Cards:', lootCardSap);
        console.log('Drifters:', numDrifters);
        console.log('SAP Cans from Drifters:', sap);
        console.log('Total SAP Cans:', lootCardSap + sap);

        console.log('SAP Cans from Loot Cards (holding back one loot card of each):', lootCardSap2);
        console.log('Total SAP Cans (holding back one loot card of each):', lootCardSap2 + sap);

    });
}

main()
.then(() => process.exit(0))
.catch(e => {
    console.error(e);
    process.exit(1);
})