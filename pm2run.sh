npm run build

pm2 --name start-remove-history start npm -- run start-remove-history
pm2 --name start-sub-part start npm -- run start-sub-part
pm2 --name start-rest start npm -- run start-rest