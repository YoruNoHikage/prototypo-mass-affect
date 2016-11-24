#! /usr/bin/env node

const fs = require('fs');
const parseCSV = require('csv-parse');
const promptly = require('promptly');
const nodemailer = require('nodemailer');

const generatePassword = require('password-generator');
const register = require('./register');
const { config: mailConfig, createMail } = require('./mail');

const csvPath = process.argv.slice(2)[0];

if (!csvPath) {
  console.log('Please specify a csv path');
  process.exit(-1);
}

// Since promptly doesn't have asynchronous validator, we can't use retry option, so there's this instead
const askPassword = () => {
  return promptly.password('Prototypo gmail password: ')
    .then((password) => {
      mailConfig.auth.pass = password;
      const transporter = nodemailer.createTransport(mailConfig);
      return transporter.verify().then(
        success => password,
        (err) => { console.log(err.message); return askPassword(); }
      );
    });
};

fs.readFile(csvPath, 'utf-8', (err, data) => {
  if (err) throw err;
  
  console.log('Reading', csvPath);
  
  parseCSV(data, (err, informations) => {
    if (err) throw err;
    
    informations.forEach(([name, email, plan, date]) => {
      console.log(`${name} <${email}>, '${plan}' will end at ${new Date(date).toLocaleString()}`);
    });
    
    const confirm = promptly.confirm('Is it good? (y/n) ')
      .then((confirmed) => {
        if (!confirmed) {
          console.log('Aborting...');
          process.exit();
        }
        
        return askPassword();
      })
      .then(emailPassword => {
        mailConfig.auth.pass = emailPassword;
        const transporter = nodemailer.createTransport(mailConfig);
        
        const tasks = informations.map(([name, email, plan, date], index) => {
          const password = generatePassword(8, false);
          const options = {
            name,
            endTrial: new Date(date),
            plan,
          };
          return register(email, password, options)
            .then(
              (statuses) => {
                return transporter.sendMail(
                  createMail({name: options.name, email, password, endTrial: options.endTrial})
                )
                .then((infos) => {
                  if (infos.rejected.length > 0) {
                    console.warn(`WARN: ${email} has been rejected!`);
                  }
                  
                  console.log(`OK ${name} <${email}>`);
                });
              },
              e => console.log(`ERR ${name} <${email}> (${e.message})`)
            );
        });
        
        Promise.all(tasks.map(p => p.catch((e) => console.error(e)))).then(() => process.exit());
    });
  });
});