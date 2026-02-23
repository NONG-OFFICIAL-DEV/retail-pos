# env 
copy .env.example rename .env

# install core

npm config set @nong-official-dev:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN

npm install @nong-official-dev/core