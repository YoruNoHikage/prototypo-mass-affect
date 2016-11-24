const fetch = require('node-fetch');
const Intercom = require('intercom-client');
const isProd = process.argv.indexOf('production') > -1;

const HOODIE_URL = isProd ? 'https://prototypo-dev.appback.com' : 'https://prototypo.appback.com';
const AWS_URL = `https://e4jpj60rk8.execute-api.eu-west-1.amazonaws.com/${isProd ? 'prod' : 'dev'}`;

// Simulate browser environment for Hoodie
const MockBrowser = require('mock-browser').mocks.MockBrowser;
const mock = new MockBrowser();
global.window = mock.getWindow();
global.addEventListener = mock.getDocument().addEventListener.bind(window);
global.jQuery = require('jquery')(window);
jQuery.ajax = require('jquery').ajax;

const Hoodie = require('hoodie');
const intercom = new Intercom.Client({token: isProd ? process.env.INTERCOM_TOKEN : process.env.INTERCOM_TEST_TOKEN});

function register(email, password, {name, plan, endTrial}) {
  const statuses = {
    hoodie: false,
    stripe: false,
    stripe_subscription: false,
    intercom: false,
  };
  
  const hoodie = new Hoodie(HOODIE_URL);
  hoodie.emit('account:cleanup');
  // Step 1: Hoodie account creation
  return hoodie.account.signUp(email, password)
  .then(() => {
    statuses.hoodie = true;
    const hoodieId = hoodie.id();
    
    // Step 2.1: Stripe account creation
    const stripePromise = fetch(`${AWS_URL}/customers`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({hoodieId, email}),
    })
    .then(r => {
      const data = r.json();
      return r.ok && data || data.then(e => {throw new Error(e.message);});
    })
    .then(({ id: stripeId }) => {
      statuses.stripe = true;
      // Step 3: Everything went well, we subscribe the customer to a new plan with a trial
      return fetch(`${AWS_URL}/subscriptions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          customer: stripeId,
          plan,
          trial_end: endTrial.getTime() / 1000,
        }),
      })
      .then(r => {
        const data = r.json();
        return r.ok && data || data.then(e => {throw new Error(e.message);});
      })
      .then(r => {
        statuses.stripe_subscription = true;
        return r;
      });
    });

    // Step 2.2: Intercom registration
    const intercomPromise = intercom.users.create({
      email,
      signed_up_at: new Date(),
      custom_attributes: {
        ABtest: Math.floor(Math.random() * 100),
      },
    })
    .then(r => {
      statuses.intercom = true;
      return r;
    });

    // We catch errors to wait for every Promise to end (Promise.all rejects when first promise rejects)
    return Promise.all([
      stripePromise.catch(e => e),
      intercomPromise.catch(e => e),
    ]).then(([stripeRes, intercomRes]) => {
      if (stripeRes instanceof Error) throw stripeRes;
      if (intercomRes instanceof Error) throw intercomRes;

      return statuses;
    });
  });
}

// This to avoid some weird error happening in hoodie (maybe a library version mismatch?)
process.on('uncaughtException', (err) => {
  if (err.message !== '"callback" argument must be a function') {
    throw err;
  }
});

module.exports = register;