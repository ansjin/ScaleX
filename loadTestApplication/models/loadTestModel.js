var mongoose = require('mongoose');

var loadTestModelSchema = new mongoose.Schema({
	latencyS : { type : Object },
	resultS : { type : Object },
	errorS : { type : Object },
    requestElapsedS : { type : Object},
    requestIndexS : { type : Object},
    instanceIndexS : { type : Object }
});

loadTestModelSchema.set('toJSON', {
	transform: function (doc, ret, options) {
		ret.id = ret._id;
		delete ret._id;
	}
});
module.exports = mongoose.model('loadTestModel', loadTestModelSchema);