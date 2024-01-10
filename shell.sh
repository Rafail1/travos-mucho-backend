git clone https://github.com/Rafail1/travos-mucho-backend
cd travos-mucho-backend/
sudo apt update
sudo apt upgrade
sudo apt install curl 
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash 

sudo apt install postgresql


echo 'PART="'$part'"' >> /etc/environment
echo 'DATABASE_URL="postgresql://tramuches:IPFHfr6&63!-@localhost:5432/travos-muchos"' >> /etc/environment

echo "" >> /etc/hosts
echo "185.251.38.11 scalp24.store" >> /etc/hosts
echo "185.251.38.12 scalp24.store" >> /etc/hosts
echo "185.251.38.40 scalp24.store" >> /etc/hosts
source /etc/environment
source ~/.bashrc
nvm install --lts
nvm use --lts
npm i

sudo -u postgres psql
CREATE DATABASE "travos-muchos";
CREATE USER tramuches WITH ENCRYPTED PASSWORD 'IPFHfr6&63!-';
GRANT ALL PRIVILEGES ON DATABASE "travos-muchos" TO tramuches;
quit

npm install pm2@latest -g
sh pm2run.sh