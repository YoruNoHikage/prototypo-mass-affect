const config = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
      user: 'contact.prototypo@gmail.com',
      // Don't set pass, it will be asked
  }
};

function createMail({ name, email, password, endTrial }) {
  return {
      from: '"Prototypo" <contact.prototypo@gmail.com>',
      to: email,
      subject: 'Account creation',
      text: `Hello ${name}, here's your password: ${password}. You should change this! Your account will expire on ${endTrial.toDateString()}`,
      html: `Hello ${name}, here's your password: ${password}. You should change this! Your account will expire on ${endTrial.toDateString()}`,
  };
}

module.exports = {
  config,
  createMail,
};