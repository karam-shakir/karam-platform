SELECT column_name, column_default, data_type 
FROM information_schema.columns 
WHERE table_name = 'host_families' AND column_name = 'status';
