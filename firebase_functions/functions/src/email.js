const { getEmailSettings } = require('./firebase');

const mailgunSendEmail = (packet, emailSettings) => {
  const {
    apiKey, domain, emailRecepient, emailBcc, emailReplyTo, emailSender, emailList
  } = emailSettings;
  const mg = require('mailgun-js')({ apiKey, domain });
  mg.messages().send(
    {
      from: `Coordicide <${emailSender}>`,
      to: emailRecepient,
      bcc: emailBcc,
      'h:Reply-To': packet.email,
      subject: 'Coordicide Form Inquiry',
      html: `<div>
          <p><strong>Name: </strong>   ${packet.name}</p>
        </div>
        <div>
          <p><strong>Email: </strong>   ${packet.email}</p>
        </div>
        <div>
          <p><strong>Message:</strong></p><p>${packet.message}</p>
        </div>
        <div>
          <p><strong>Newsletter: </strong>   ${packet.newsletter}</p>
        </div>`
    },
    (error) => {
      if (error) {
        console.log('Email callback error', error);
        return error;
      }
    }
  );

  if (packet.newsletter.toString() === 'true') {
    const list = mg.lists(emailList);
    const user = {
      subscribed: true,
      address: packet.email,
      name: packet.name
    };

    list.members().create(user, error => {
      if (error) {
        console.log('Email members callback error', error);
        return error;
      }
    });
  }

  mg.messages().send(
    {
      from: `IOTA <${emailReplyTo}>`,
      to: packet.email,
      'h:Reply-To': emailReplyTo,
      subject: 'Submission Recieved',
      html: `Hi
        <br/>
        <br/>
        Many thanks for your interest in IOTA.
        <br/>
        <br/>

        We do our best to review all submissions and get in touch with prioritized use cases and organisations based on their ability to contribute and impact the development of the technology.
        <br/>
        <br/>

        The whole IOTA team thanks you again for your interest and is looking forward to collaborating with you.
        <br/>
        <br/>

        IOTA Foundation
        <br/>
        www.iota.org`
    },
    error => {
      if (error) {
        console.log('Email automatic reply error', error);
        return error;
      }
    }
  );

  return 'success';
};

exports.sendEmail = async packet => {
  const emailSettings = await getEmailSettings();

  // Send message
  const status = mailgunSendEmail(packet, emailSettings);
  return status;
};
