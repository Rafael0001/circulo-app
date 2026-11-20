-- Raise pulso photo upload limit to 5 MB (frontend validates the same cap).
update storage.buckets
set file_size_limit = 5242880
where id = 'pulso-photos';
