update brokers
set notes = trim(both ' •' from regexp_replace(notes, '( • )?Rental focus: (Strong|Mixed)', '', 'g'))
where notes ~ 'Rental focus: ';

update submissions
set notes = trim(both ' •' from regexp_replace(notes, '( • )?Rental focus: (Strong|Mixed)', '', 'g'))
where notes ~ 'Rental focus: ';
