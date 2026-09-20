-- FH-31: State Franchise is optional for City Franchise.
-- NULL stateFranchiseId means the City Franchise is directly parented by X Nail / HDK.
-- Existing state-backed rows remain valid and the existing FK continues to enforce valid parents
-- when stateFranchiseId is present.

ALTER TABLE "CityFranchise" ALTER COLUMN "stateFranchiseId" DROP NOT NULL;