## Steps To Reproduce

### start a local postgres server
```
docker-compose up
```

### run the tests
```
npm t
```

This will run 4 tests:

- 2 tests using sqlite.
    - one fails
    - one passes

- 2 tests using postgres.
    - one fails
    - one passes

They fail for different reasons.
