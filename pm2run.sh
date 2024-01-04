npm run build
npm run migrate
pm2 --name start-sub-first start npm -- run start-sub-first
pm2 --name start-remove-history start npm -- run start-remove-history
pm2 --name run migrate start npm -- run migrate --cron "0 */2 * * *"
