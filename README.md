# Banknames
All the bank names in the world, organized by their BIC-code. 

Generated from the official SWIFT registry (one massive PDF-file) by parsing it using [tabula](https://github.com/tabulapdf/tabula-java). 
SWIFT updates the registry every once in a while, you can fetch the latest release [here](https://github.com/lobax/banknames/releases/latest)
or build it yourself. 

## Build instructions

1. Clone this repository
2. Run `npm run build`. 
3. Grab a coffee, this can take a minute or two ☕

The generated bank names will be stored per country as json files under the `banks/` directory. 

For example, Andorran banks will be saved under `banks/AD.json` and look something like this:

```json
{
  "AAMA": "ANDORRA GESTIO AGRICOL REIG SAU SGOIC",
  "AFAD": "AUTORITAT FINANCERA ANDORRANA",
  "BACA": "ANDORRA BANC AGRICOL REIG S.A.",
  "BINA": "MORA BANC GRUP, SA",
  "BSAN": "MORA BANC GRUP, SA",
  "CASB": "BANCAPRIVADAD'ANDORRAS.A.ESCALDES ENGORDANY",
  "CRDA": "CREDIT ANDORRA, S.A.",
  "RPAT": "REIG PATRIMONIA SA"
}
```
