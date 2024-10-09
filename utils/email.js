import nodemailer from "nodemailer";
import path from 'path';
import dotenv from 'dotenv'

dotenv.config()

export const transporterConstructor = () => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",

    auth: {
      user: process.env.APP_EMAIL,
      pass: process.env.APP_PASS,
    },
  });
  return transporter;
};

// Configure handlebars options
export const handlebarConfig =() => {
// Configure handlebars options
const handlebarOptions = {
  viewEngine: {
    extName: '.hbs',
    partialsDir: path.resolve('./views/'),
    defaultLayout: false,
  },
  viewPath: path.resolve('./views/'),
  extName: '.hbs',
};
return handlebarOptions
};

export const generateOTP = () => {
  const otpLength = 6;
  const upperCaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowerCaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const digitChars = '0123456789';
  const specialChars = '@$!%*?&';
  const allChars = upperCaseChars + lowerCaseChars + digitChars + specialChars;

  let otp = '';
  otp += upperCaseChars[Math.floor(Math.random() * upperCaseChars.length)];
  otp += lowerCaseChars[Math.floor(Math.random() * lowerCaseChars.length)];
  otp += digitChars[Math.floor(Math.random() * digitChars.length)];
  otp += specialChars[Math.floor(Math.random() * specialChars.length)];

  // Add remaining 2 characters to meet the desired length 6
  for (let i = 4; i < otpLength; i++) {
    const randomIndex = Math.floor(Math.random() * allChars.length);
    otp += allChars[randomIndex];
  }

  // Shuffle the OTP to ensure the first 4 characters are not in a predictable pattern
  otp = otp.split('').sort(() => 0.5 - Math.random()).join('');

  console.log("Generated OTP: ", otp);
  return otp;
};
