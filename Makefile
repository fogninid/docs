.PHONY: client
client:
	mkdir -p client/build
	cp -r client/lib/* client/build
	cp -r client/src/* client/build
