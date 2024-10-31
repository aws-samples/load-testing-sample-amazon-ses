'use strict'

function generateUniqueCode() {
  const timestamp = Date.now().toString(36); // Convert current timestamp to base36 string
  const randomString = Math.random().toString(36).substring(5, 10); // Generate a random string
  
  return timestamp + randomString;
}

function generateUserId() {
	const user_id = Math.floor(Math.random() * 10000) + 1; // Generate a random user id
	
	return user_id.toString();
}

const generateMessages = (userContext, events, done) => {

  userContext.vars.from = "sender@example.com"
  userContext.vars.to = "success@simulator.amazonses.com"
  userContext.vars.template_name = "SimpleEmail"
  userContext.vars.user_id = generateUserId()
  userContext.vars.config_set = "sesbenchconfsetname"
  userContext.vars.tags = [{"Name":"campaign","Value":"run12"}]
  userContext.vars.unique_code = generateUniqueCode()

  return done()
}

module.exports = {
  generateMessages
}
