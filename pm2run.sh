pm2 --name start-sub start npm -- run start-sub-first
sleep 10
pm2 --name start-sub start npm -- run start-sub-second
sleep 10
pm2 --name start-sub start npm -- run start-sub-third
sleep 10
pm2 --name start-rest start npm -- run start-rest
sleep 10
pm2 --name start-ob start npm -- run start-ob
sleep 10
pm2 --name start-remove-history start npm -- run start-remove-history
