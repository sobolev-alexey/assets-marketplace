// const axios = require('axios');
const { getEmailSettings } = require('./firebase');

// const checkRecaptcha = async (captcha: string, emailSettings: any) => {
//   const response = await axios({
//     method: 'post',
//     url: `https://www.google.com/recaptcha/api/siteverify?secret=${emailSettings.googleSecretKey}&response=${captcha}`,
//   });
//   return response ? response.data : null;
// };

const mailgunSendEmail = (packet: any, emailSettings: any) => {
  const {
    apiKey, domain, emailRecepient, emailBcc, emailReplyTo, emailSender, emailList,
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
        </div>`,
    },
    (error: any) => {
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
      name: packet.name,
    };

    list.members().create(user, (error: any) => {
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

        The whole IOTA team thank you again for your interest and look forward to collaborating with you.
        <br/>
        <br/>

        IOTA Foundation
        <br/>
        www.iota.org`,
    },
    (error: any) => {
      if (error) {
        console.log('Email automatic reply error', error);
        return error;
      }
    }
  );

  return 'success';
};

exports.sendEmail = async (packet: any) => {
  const emailSettings = await getEmailSettings();
  // // Check Recaptcha
  // const recaptcha = await checkRecaptcha(packet.captcha, emailSettings);
  // if (!recaptcha || !recaptcha.success) {
  //   console.log('sendEmail failed. Recaptcha is incorrect. ', recaptcha['error-codes']);
  //   return 'Malformed Request';
  // }

  // Send message
  const status = mailgunSendEmail(packet, emailSettings);
  return status;
};
