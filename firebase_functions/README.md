## Data Marketplace functions

Firebase functions for Data Marketplace

#### Install Firebase CLI

Before you can install the Firebase CLI, you will need to install `Node.js` on your machine. Once you've installed `Node.js`, you can install the Firebase CLI using `npm` by running the following command:

```javascript
npm install -g firebase-tools
```

#### Install dependencies

Install dependencies listed in `functions` package.json files

```javascript
cd functions && yarn
```

#### Build project

Project is written in TypeScript, so you'll need to build it before deploying. This will create a new folder `lib` under `functions`.

```javascript
cd functions && yarn build
```

## Testing

To test this locally, run
`firebase functions:shell`

Then call a function with parameters
`assets.get('/assets')`

order.post('/order').form({apiKey: '4d0c6a2e-6868-451c-8fbf-38c903c9d5ad', offerId: '8ea3ffa6-e62d-4ee9-a5fc-f31fb6d3bc92', requestId: '4321f243-e296-4db5-9894-df2843bc78d0'})

history.post('/history').form({apiKey: '4d0c6a2e-6868-451c-8fbf-38c903c9d5ad', assetId: '61bedaf1-a93e-4d9e-a49b-6dda9bbca357'})

history.post('/history').form({apiKey: '76169630-4289-4fc0-8098-3942fd326fe0', assetId: '73069964-cc25-406e-bc1b-0ca1b88934d4'})

cancel.post('/cancel').form({apiKey: '76169630-4289-4fc0-8098-3942fd326fe0', orderId: '1c895f1d-7827-483b-b1c9-d5e89afaeaa8'})

orders.post('/orders').form({apiKey: '76169630-4289-4fc0-8098-3942fd326fe0'})

order.post('/order').form({"apiKey":"76169630-4289-4fc0-8098-3942fd326fe0","offerId":"3befd7c6-9f03-4abd-9ab2-84f9936975a2","requestId":"82060882-ec2b-4829-a68a-e516b9086817", debug:true})


#### Deploy fo Firebase

1.  Log in to Firebase (for the first time use). Follow instructions on the screen.

```javascript
firebase login
```

2.  Deploy

```javascript
firebase deploy --project PROJECT_NAME
```

### Handling function timeouts
Default timeout can be changed here https://console.cloud.google.com/functions/list
After you select your function and then press "Edit" it is located under the "More" drop-down at the bottom of the page. The current max is 540 seconds.
Read more https://firebase.google.com/docs/functions/manage-functions#set_timeout_and_memory_allocation


### CORS

See https://cloud.google.com/storage/docs/configuring-cors
You can also use the `gsutil cors` command to get the CORS configuration of a bucket:

```
gsutil cors get gs://asset-marketplace.appspot.com
```

Use the `gsutil cors` command to configure CORS on a bucket:

```
gsutil cors set cors-config.json gs://asset-marketplace.firebaseapp.com
```
