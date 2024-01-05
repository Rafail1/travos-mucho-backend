npm run build

pm2 --name migrate start --cron-restart "*/30 * * * *" --no-autorestart npm -- run migrate
pm2 --name start-sub-all start npm -- run start-sub-all
sleep 10
pm2 --name start-rest start npm -- run start-rest
pm2 --name start-ob start npm -- run start-ob
sleep 20
pm2 --name start-remove-history start npm -- run start-remove-history
pm2 --name start-remove-history start npm -- run init-snapshot-calculated