git clone https://Rafail1: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@github.com/Rafail1/travos-mucho-backend
cd travos-mucho-backend/
sudo apt update
sudo apt upgrade
sudo apt install curl 
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash 
source ~/.bashrc
nvm install --lts 
npm i
sudo apt install postgresql
sudo -u postgres psql
CREATE DATABASE "travos-muchos";
CREATE USER tramuches WITH ENCRYPTED PASSWORD 'IPFHfr6&63!-';
GRANT ALL PRIVILEGES ON DATABASE "travos-muchos" TO tramuches;
quit

npm install pm2@latest -g

echo 'PART="2"' >> /etc/environment
echo 'DATABASE_URL="postgresql://tramuches:IPFHfr6&63!-@localhost:5432/travos-muchos"' >> /etc/environment

sh pm2run.sh