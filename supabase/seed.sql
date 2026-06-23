-- seed.sql
-- DocVault — Dr.Docs service catalogue (Section 9.1, Week 9-10: "Populate
-- services table with all Dr.Docs services"). Prices are in paise.
-- The plan references ~31 services; the representative catalogue below spans
-- every category and can be extended from the Dr.Docs pricing sheet.
-- ---------------------------------------------------------------------------

insert into public.services
  (category, name, description, what_we_do, docs_required, govt_fee, service_fee, total_price, estimated_days, sort_order)
values
  -- PAN ----------------------------------------------------------------------
  ('pan', 'New PAN Card Application',
   'Apply for a brand-new PAN card from home. No queues, no agents to chase.',
   'We fill the form, verify your documents, submit to NSDL/UTI and track until your PAN is delivered.',
   '["Aadhaar Card","Passport-size photo","Date of birth proof"]'::jsonb,
   10700, 19300, 30000, 10, 1),
  ('pan', 'PAN Correction / Update',
   'Fix a name, DOB or photo error on your existing PAN card.',
   'We prepare the correction request, attach proofs and submit for reprint.',
   '["Existing PAN","Aadhaar Card","Proof of correct detail"]'::jsonb,
   10700, 19300, 30000, 12, 2),
  ('pan', 'PAN-Aadhaar Linking',
   'Link your PAN with Aadhaar to avoid the Rs.10,000 penalty.',
   'We verify both numbers, pay the government fee and confirm the link with the ITD.',
   '["PAN","Aadhaar Card"]'::jsonb,
   100000, 19900, 119900, 3, 3),

  -- AADHAAR ------------------------------------------------------------------
  ('aadhaar', 'Aadhaar Address Update',
   'Update the address printed on your Aadhaar.',
   'We complete the UIDAI update request and submit valid address proof on your behalf.',
   '["Aadhaar Card","Address proof"]'::jsonb,
   5000, 24900, 29900, 7, 4),
  ('aadhaar', 'Aadhaar Mobile Number Update',
   'Link or change the mobile number registered with your Aadhaar.',
   'We book a UIDAI slot and guide the biometric update for your registered mobile.',
   '["Aadhaar Card"]'::jsonb,
   5000, 24900, 29900, 5, 5),

  -- PASSPORT -----------------------------------------------------------------
  ('passport', 'New Passport Application',
   'Apply for a fresh Indian passport end to end.',
   'We fill the form, book the PSK appointment, prepare the file and guide you through verification.',
   '["Aadhaar Card","PAN","Birth Certificate","Address proof"]'::jsonb,
   150000, 149900, 299900, 21, 6),
  ('passport', 'Passport Renewal / Re-issue',
   'Renew an expiring or expired passport.',
   'We submit the re-issue request, book your appointment and prepare all documents.',
   '["Old Passport","Aadhaar Card","Address proof"]'::jsonb,
   150000, 149900, 299900, 18, 7),
  ('passport', 'Tatkal Passport (Emergency)',
   'Get your passport fast under the Tatkal scheme.',
   'Priority Tatkal filing with verification appointment within days.',
   '["Aadhaar Card","PAN","Voter ID"]'::jsonb,
   350000, 199900, 549900, 7, 8),

  -- DRIVING LICENSE ----------------------------------------------------------
  ('driving_license', 'Driving License Renewal',
   'Renew your driving license before it expires.',
   'We file the renewal on Parivahan, pay the fee and book any required slot.',
   '["Old DL","Aadhaar Card","Passport-size photo"]'::jsonb,
   20000, 29900, 49900, 10, 9),
  ('driving_license', 'New Learner License',
   'Apply for a fresh learner''s license.',
   'We complete the LL application and book your online test slot.',
   '["Aadhaar Card","Age proof","Passport-size photo"]'::jsonb,
   15000, 24900, 39900, 5, 10),
  ('driving_license', 'DL Address Change',
   'Update the address on your driving license.',
   'We submit the change-of-address request with valid proof.',
   '["DL","Aadhaar Card","Address proof"]'::jsonb,
   20000, 24900, 44900, 12, 11),

  -- VOTER ID -----------------------------------------------------------------
  ('voter_id', 'New Voter ID Registration',
   'Register as a voter and get your Voter ID (EPIC).',
   'We file Form 6 with the ECI, attach proofs and track issuance.',
   '["Aadhaar Card","Age proof","Address proof","Passport-size photo"]'::jsonb,
   0, 19900, 19900, 21, 12),
  ('voter_id', 'Voter ID Correction',
   'Correct your name, photo or address on the Voter ID.',
   'We file Form 8 for corrections and follow up to delivery.',
   '["Voter ID","Aadhaar Card","Proof of correct detail"]'::jsonb,
   0, 19900, 19900, 21, 13),

  -- CERTIFICATES -------------------------------------------------------------
  ('certificate', 'Birth Certificate',
   'Obtain or correct an official birth certificate.',
   'We coordinate with the municipal authority and collect the certificate.',
   '["Hospital record / proof","Parent ID","Address proof"]'::jsonb,
   5000, 44900, 49900, 15, 14),
  ('certificate', 'Marriage Certificate',
   'Register your marriage and obtain the certificate.',
   'We prepare the registration file and book your appointment at the registrar.',
   '["Aadhaar (both)","Wedding photos","Witness IDs","Address proof"]'::jsonb,
   10000, 89900, 99900, 20, 15),
  ('certificate', 'Income Certificate',
   'Get an income certificate from the revenue department.',
   'We file the application with supporting proofs and collect the certificate.',
   '["Aadhaar Card","Income proof","Address proof"]'::jsonb,
   3000, 26900, 29900, 12, 16),

  -- NRI ----------------------------------------------------------------------
  ('nri', 'NRI Document Consultation',
   'Video consultation for NRI documentation needs (POA, OCI, attestation).',
   'A Dr.Docs specialist advises on your case and prepares a document plan.',
   '["Passport","Visa / residence proof"]'::jsonb,
   0, 99900, 99900, 2, 17),
  ('nri', 'Power of Attorney (POA) Drafting',
   'Draft and process a Power of Attorney for use in India.',
   'We draft the POA, arrange attestation and courier the executed document.',
   '["Passport","Address proof (abroad)","Property / matter details"]'::jsonb,
   50000, 249900, 299900, 14, 18);
