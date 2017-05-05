.PHONY: client
client:
	mkdir -p client/build
	cp client/src/html/* client/build
	cp -r client/src/js client/build
