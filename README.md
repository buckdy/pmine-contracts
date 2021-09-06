# MINE Network Smart Contracts

## Developer instructions

### Install dependencies
`yarn install`

### Create .env file and make sure it's having following information:
```
INFURA_KEY = Your Infura Key
MNEMONIC = Your MNEMONIC
```

### Create developmentConfig.json file in deployments folder and make sure it's having following information:
```
{
    network: {
        "ownerAddress": Owner_Address
        "managerAddress": Manager_Address,
        "treasuryAddress": Treasury_Address,
        "rewardDepositorAddress": Reward_Depositor_Address,
        "maintainerAddress": Maintainer_Address
    }
}
```

### Compile code
- `npx hardhat clean` (Clears the cache and deletes all artifacts)
- `npx hardhat compile` (Compiles the entire project, building all artifacts)

### Deploy code 
- `npx hardhat node` (Starts a JSON-RPC server on top of Hardhat Network)
- `npx hardhat run --network {network} scripts/{desired_deployment_script}`

### Flatten contracts
- `npx hardhat flatten` (Flattens and prints contracts and their dependencies)

### Deployed addresses and bytecodes
All deployed addresses and bytecodes can be found inside `deployments/contract-addresses.json` and `deployments/contract-abis.json` files.
