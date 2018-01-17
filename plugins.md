# Freelance.js Plugins


## Contact Form Emailer

First `npm install --save nodemailer`

https://ethereal.email

`POST /_api/contact`

### Example

Using a test account:

```js
exports.plugins = {

  'contact-form': {
    smpt: 'test',

    getEmailDetails: function (formFields) {
      // formFields is the POST body to /_api/contact
      return {
        from: '"Mr. Client" <mr.client@example.com>', // sender address
        to: 'the.user@example.com, someone.else@example.com', // list of receivers
        subject: 'Hello ✔', // Subject line
        text: 'Hello world?', // plain text body
        html: '<b>Hello world?</b>' // html body
      }
    }
  }
}
```