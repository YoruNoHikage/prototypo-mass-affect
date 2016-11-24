Mass Affect™
============

Mass Affect™ a lot of users to Prototypo from a CSV.

Usage
-----

Set `INTERCOM_TOKEN` (and/or `INTERCOM_TEST_TOKEN`) as an environment variable first.
Then `npm install -g YoruNoHikage/prototypo-mass-affect`.
Now, run `mass-affect mycsv.csv --production` to mass register everyone to Prototypo!

CSV Format
----------

For now the format is like this (See example.csv):
```<name>,<email>,<plan>,<end_of_trial>```