// Emits each element of the input stream until the control stream has emitted an
// element.
function takeUntil(stream, control) {

    return new Observable(sink => {

        let sourceCancel = stream.subscribe(sink);

        let inputCancel = control.subscribe({

            next: x => sink.return(x),
            throw: x => sink.throw(x),
            return: x => sink.return(x),
        });

        return _=> {

            sourceCancel();
            inputCancel();
        };
    });
}

// For a nested stream, emits the elements of the inner stream contained within the
// most recent outer stream
function switchLatest(stream) {

    return new Observable(sink => {

        let cancelInner = null;

        let cancelOuter = stream.subscribe({

            next(value) {

                if (cancelInner)
                    cancelInner();

                cancelInner = value.subscribe({

                    next: x => sink.next(x),
                    throw: x => sink.throw(x),
                });
            },

            throw: x => sink.throw(x),
            return: x => sink.return(x),

        });

        return _=> {

            if (cancelInner)
                cancelInner();

            cancelOuter();
        };
    });
}

// Returns an observable of DOM element events
function listen(element, eventName) {

    return new Observable(sink => {

        function handler(event) { sink.next(event) }

        element.addEventListener(eventName, handler);

        return _=> {

            element.removeEventListener(eventName, handler);
            sink.return();
        };
    });
}

// Returns an observable of drag move events for the specified element
function mouseDrags(element) {

    // For each mousedown, emit a nested stream of mouse move events which stops
    // when a mouseup event occurs
    let moveStreams = listen(element, "mousedown").map(e => {

        e.preventDefault();

        return takeUntil(
            listen(element, "mousemove"),
            listen(document, "mouseup"));
    });

    // Return a stream of mouse moves nested within the most recent mouse down
    return switchLatest(moveStreams);
}

let cancel = mouseDrags(document.body).subscribe({

    next(e) { console.log(`DRAG: <${ e.x }:${ e.y }>`) },
    throw(x) { console.log(`ERROR: ${ x }`) },
    return(x) { console.log(`COMPLETE: ${ x }`) },
});
