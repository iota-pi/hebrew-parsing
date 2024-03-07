import { scryptSync } from 'crypto'

// usage example:
// $ cd lambda
// $ yarn tsx createPassword.ts thisisthesalt thisisthepassword
//
// Save the salt you used as the BGF_PASSWORD_SALT secret on Github
// Save the resulting hash as the BGF_PASSWORD_HASH secret on Github

/* eslint-disable no-console */

const salt = process.argv[2]
const password = process.argv[3]
const result = scryptSync(password, salt, 64)
console.log(result.toString('base64'))
