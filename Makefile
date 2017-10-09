DESTDIR = /srv/http/docs

.PHONY: all
all: client server
	@echo "built all"

.PHONY: client
client:
	@mkdir -p client/build
	@cp -r client/lib/* client/build
	@cp -r client/src/* client/build
	@echo "built client"

node_modules:
	npm install

.PHONY: server
server: node_modules
	@echo "built server"

.PHONY: install
install: client server
	cp -a node_modules/ $(DESTDIR)/server/
	cp server/src/js/*.js $(DESTDIR)/server/
	cp -r client/build/* $(DESTDIR)/statics/
