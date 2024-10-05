interface Transaction {
    block: {
        curNr: number;
        /**
         * The timestamp of the transaction in ISO 8601 format.
         * @example "2024-10-05T120000.000Z"
         */
        timestamp: string;
        transaction: string;
        previoushash: string;
        pow: number;
    };
}

interface Block {
    block: Transaction["block"] & {
        owner: string;
        nonce: number;
    };
    newhash: string;
}
