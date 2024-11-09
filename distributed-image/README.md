# distributed-image

This application has two actors:

## Host

https://localhost:3000/host

This actor is responsible for serving the image. It reads the image from the file system and sends it to the clients.

## Client

https://localhost:3000/

This actor is responsible for displaying the image. It receives the images from the host and displays them.

## How to run

Prerequisites:

-   node.js (tested with v22.8.0)
-   pnpm (tested with v9.12.3)

```bash
pnpm i
pnpm start
```
