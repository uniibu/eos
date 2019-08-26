#!/usr/bin/env bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "This script must be ran as root or sudo" 1>&2
   exit 1
fi

die () {
  ret=$?
  print "%s\n" "$@" >&2
  exit "$ret"
}

echo "Installing EOS Docker"

mkdir -p $HOME/.eos/logs

echo "Initial EOS Configuration"

read -p 'setup environment(production,staging,development): ' environment
read -p 'enter EOS account maker address:' eosmakeracc
read -p 'enter EOS account maker private key:' eosmakerpriv
read -p 'enter DFUSE API KEY:' dfuseapi
read -p 'notify url(this url will be called when a deposit arrives): ' notify


[[ -z "$notify" ]] && die "Error: notify url is required. exiting..."

echo "Creating Stellar configuration at $HOME/.eos/eos.env"

cat >$HOME/.eos/eos.env <<EOL
NODE_ENV=$environment
EOS_ACCOUNT=$eosmakeracc
EOS_PRIV_KEY=$eosmakerpriv
NOTIFY_URL=$notify
DFUSE_API_KEY=$dfuseapi
PORT=8866
EOL

cat >$HOME/.eos/db.json <<'EOL'
{
  "block": {
    "latest": 0
  },
  "owner": {
    "public": "",
    "private": ""
  },
  "active": {
    "public": "",
    "private": ""
  },
  "secret": {
    "key": ""
  }
}
EOL

echo Installing EOS Container

docker volume create --name=eos-data
docker pull unibtc/eos:latest
docker run -v eos-data:/usr/src/app --name=eos-node -d \
      -p 8866:8866 \
      -v $HOME/.eos/eos.env:/usr/src/app/.env \
      -v $HOME/.eos/db.json:/usr/src/app/db.json \
      -v $HOME/.eos/logs:/usr/src/app/logs \
      unibtc/eos:latest

cat >/usr/bin/eos-cli <<'EOL'
#!/usr/bin/env bash
docker exec -it eos-node /bin/bash -c "eos-cli $*"
EOL

cat >/usr/bin/eos-update <<'EOL'
#!/usr/bin/env bash
if [[ $EUID -ne 0 ]]; then
   echo "This script must be ran as root or sudo" 1>&2
   exit 1
fi
echo "Updating eos..."
sudo docker stop eos-node
sudo docker rm eos-node
sudo rm -rf ~/docker/volumes/eos-data
sudo docker volume rm eos-data
sudo docker pull unibtc/eos:latest
docker run -v eos-data:/usr/src/app --name=eos-node -d \
      -p 8866:8866 \
      -v $HOME/.eos/xlm.env:/usr/src/app/.env \
      -v $HOME/.eos/db.json:/usr/src/app/db.json \
      -v $HOME/.eos/logs:/usr/src/app/logs \
      unibtc/eos:latest
EOL

cat >/usr/bin/eos-rm <<'EOL'
#!/usr/bin/env bash
if [[ $EUID -ne 0 ]]; then
   echo "This script must be ran as root or sudo" 1>&2
   exit 1
fi
echo "WARNING! This will delete ALL EOS installation and files"
echo "Make sure your wallet seeds and phrase are safely backed up, there is no way to recover it!"
function uninstall() {
  sudo docker stop eos-node
  sudo docker rm eos-node
  sudo rm -rf ~/docker/volumes/eos-data ~/.eos /usr/bin/eos-cli
  sudo docker volume rm eos-data
  echo "Successfully removed"
  sudo rm -- "$0"
}
read -p "Continue (Y)?" choice
case "$choice" in
  y|Y ) uninstall;;
  * ) exit;;
esac
EOL

chmod +x /usr/bin/eos-rm
chmod +x /usr/bin/eos-cli
chmod +x /usr/bin/eos-update
echo
echo "==========================="
echo "==========================="
echo "Installation Complete"
echo
echo "RUN 'docker logs eos-node' to view your Withdraw Callback Url and Wallet Address"