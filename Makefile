DESTDIR = /srv/http/docs/

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
	cp -a node_modules/ $(DESTDIR)/server/
	cp server/src/js/*.js $(DESTDIR)/server/
	cp -r client/build/* $(DESTDIR)/statics/
