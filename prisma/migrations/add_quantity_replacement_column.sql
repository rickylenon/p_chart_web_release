-- Add quantityReplacement column to operation_defects table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'operation_defects' 
        AND column_name = 'quantityReplacement'
    ) THEN
        ALTER TABLE "operation_defects" ADD COLUMN "quantityReplacement" INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added quantityReplacement column to operation_defects table';
    ELSE
        RAISE NOTICE 'quantityReplacement column already exists in operation_defects table';
    END IF;
END $$; 