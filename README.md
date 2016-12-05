To launch the twitterbot:
```
ANSIBLE_HOST_KEY_CHECKING="false" ansible-playbook -e server_count=1 launch.yml
```

The playbook assumes that there is a file `twitter_secrets.json` in the same
directory, with the following format:

```
{
    "TWITTER_CONSUMER_KEY":"example",
    "TWITTER_CONSUMER_SECRET":"example",
    "TWITTER_ACCESS_TOKEN_KEY":"example",
    "TWITTER_ACCESS_TOKEN_SECRET":"example"
}
```

The playbook also depends on a file, in the same directory, called `secrets.yml`,
with the following format:
```
secrets:
  cloud_region: example_region
  vpc_id: example_vpc_id
  vpc_subnet_id: example_subnet_id
  key_name: example_key_name
  home_ip: example_ip
```