# Bitespeed-identity 
This is a webservice whose job is to combine the entries in a databsese based on their similarity.
This webservice is deployed on Render : 

this webservice is divided in 3 parts:
## The Identify Endpoint
This is the actual endpoint which expects HTTP POST with JSON format, eg:
```
{
  "email": "user@example.com",
  "phoneNumber": "9876543210"
}
```
To enter this endpoint just add /identity to the actual url, or just go to the link : https://bitespeed-identity-mtm7.onrender.com/identify
To POST to this endpoint you can use tool like [[https://www.postman.com/downloads/]]Postman or cURL to send the POST request.
Example curl command:
```
curl -X POST https://bitespeed-identity-mtm7.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "phoneNumber": "9876543210"}'
```
## The Test-Identify
This is the frontend application to the /identify endpoint, which is deployed for easy testing.
Instead of Posting manual request to the endpoint, we can just enter the data in the specified text area which will take those data and form a JSON request which will be posted as request.
To go to this webservice, just add /test-identify to the main url, or just go to the link : https://bitespeed-identity-mtm7.onrender.com/test-identify
It's a simple frontend implimentation just to ease the testing oof the endpoint.

## The URL Check
This webservice just checks the actual implementation, like wether it's properly deployed and so on.
To check this service..just go to the actual url without any /text added or just go to the link : https://bitespeed-identity-mtm7.onrender.com/

## Deployement
To deploy the project yourself,
- install the typscript ` npm install typescript `
- Then execute `npx tsc --build`
- then just execute `npm run build`
- your webservice is hosted on localhost:3000 
