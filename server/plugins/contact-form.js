var nodemailer = require('nodemailer')


module.export = function contactFormPlugin (config, router) {

  router.post('/_api/contact', function (req, res, next) {
    var getSmtp = config.smtp === 'test'
      ? function (cb) { return nodemailer.createTestAccount(cb) }
      : function (cb) { cb(null, config.smtp) }

    getSmtp(function (error, smtp) {
      if (err) {
        return console.error('Failed to create a testing account. ' + err.message)
      }
      console.log('[DEBUG] Credentials obtained, sending message...')

      var email = config.getEmailDetails(req.body)

      sendEmail(smtp, email, function (error, result) {
        if ( error ) {
          return console.log('[Lance] Error sending email:', error)
        }
        console.log('[DEBUG] Sent email!', result)
        console.log('[DEBUG] View at:', nodemailer.getTestMessageUrl(result))
        res.send({ sent: true })
      })
    })
  })
}


function sendEmail (smpt, email, callback) {
  let transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
          user: account.user,
          pass: account.pass
      }
  })

  // let message = {
  //   from: 'Sender Name <sender@example.com>',
  //   to: 'Recipient <recipient@example.com>',
  //   subject: 'Nodemailer is unicode friendly ✔',
  //   text: 'Hello to myself!',
  //   html: '<p><b>Hello</b> to myself!</p>'
  // }

  transporter.sendMail(email, callback)
}
