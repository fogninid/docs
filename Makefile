.PHONY: client
client:
	mkdir -p client/build
	cp -r client/lib/* client/build
	cp -r client/src/* client/build

.PHONY: server
server:
	npm install

.PHONY: install
install:
	cp -a node_modules/ /srv/http/docs/server/
	cp server/src/js/*.js /srv/http/docs/server/
	cp -r client/build/* /srv/http/docs/statics/
