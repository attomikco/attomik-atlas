-- Add logo_url to brands and remove client_name/client_email
alter table brands add column if not exists logo_url text;
alter table brands drop column if exists client_name;
alter table brands drop column if exists client_email;
