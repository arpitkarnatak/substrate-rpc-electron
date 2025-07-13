# Polkadot Token Tracker

![Screenshot](./public/App-Screenshot.png)
This is a token tracker for DOT token (Native tokens) in substrate based chains.

## Run directly from Node

```sh
cp .env.example .env 
npm i
npm run start
```

This will run the application as an executable.

A demo of the version directly on OS
<video width="320" height="240" controls>
  <source src="./public/Executable.mp4" type="video/mp4">
</video>

## Run via docker

Since it's an executable with GUI, we run this via a web-based VNC (Virtual Network Computing)

```sh
docker compose up -d
```

After successfully being built, head over to URL [http://localhost:6080](http://localhost:6080) and click connect. 

<video width="320" height="240" controls>
  <source src="./public/VNC View.mp4" type="video/mp4">
</video>