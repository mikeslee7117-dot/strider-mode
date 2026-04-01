# Sourcebook Ingestion Status

## Files Found and Staged
- sourcebooks/The_One_Ring™_Strider™_Mode.pdf
- sourcebooks/The_One_Ring™_Tales_from_the_Lone_lands.pdf
- sourcebooks/TOR_Moria_2404.pdf

## Extraction Results
- Strider Mode: Text extraction successful.
  - Output: sourcebooks/strider_mode_extracted.txt
  - Size: ~75 KB extracted text
  - Core solo systems captured in structured schema:
    - docs/strider-mode-rules-schema.json

- Tales from the Lone-lands: Text extraction successful.
  - Output: sourcebooks/lone_lands_extracted.txt
  - Size: ~348 KB extracted text

- Moria: Text extraction successful.
  - Output: sourcebooks/moria_extracted.txt
  - Size: ~670 KB extracted text

## Practical Impact for App Build
- The solo engine can now be built from Strider rules with high confidence.
- Scenario/landmark/adversary content from Lone-lands and Moria is now searchable and can be
  indexed for AI content generation and retrieval.

## Next Technical Step
- Build a retrieval index across:
  - sourcebooks/strider_mode_extracted.txt
  - sourcebooks/lone_lands_extracted.txt
  - sourcebooks/moria_extracted.txt
- Implement adventure generation using Strider core logic + location/adversary lookups.
