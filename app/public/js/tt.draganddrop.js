var TT = TT || {};
TT.DragAndDrop = (function () {

  var pub = {};
  var dragOutFn, dragInFn, columnOut, columnIn;

  pub.getDragFn = function (element, type) {
    var fn;
    element = $(element).closest('.column');

    TT.Model.Column.each(function (index, column) {
      if (element.hasClass(column.class_name)) {
        if (type === 'in' && column.onDragIn) {
          fn = column.onDragIn;
        } else if (type === 'out' && column.onDragOut) {
          fn = column.onDragOut;
        }
      }
    });

    return fn;
  };

  pub.onStoryStart = function (event, ui) {
    columnOut = $(ui.item).closest('.column')[0];
    dragOutFn = pub.getDragFn(ui.item, 'out');
  };

  pub.onStoryBeforeStop = function (event, ui) {
    columnIn = $(ui.item).closest('.column')[0];
    if (columnOut === columnIn) {
      return true;
    }

    var data = {};
    var story = TT.Model.Story.get({ id: $(ui.item).data('id') });

    dragInFn = pub.getDragFn(ui.item, 'in');

    if (dragOutFn) {
      $.extend(data, dragOutFn(story));
    }
    if (dragInFn) {
      $.extend(data, dragInFn(story));
    }

    if (dragOutFn || dragInFn) {
      TT.Model.Story.update({ id: story.id }, data);
      TT.Model.Story.serverSave(story, data, function () {
        TT.Model.Story.changePriority(story);
      });
    }
  };

  pub.onStoryStop = function (event, ui) {
    if (columnOut === columnIn) {
      var story = TT.Model.Story.get({ id: $(ui.item).data('id') });
      TT.Model.Story.changePriority(story);
    }
    dragOutFn = dragInFn = null;
  };

  pub.initStorySorting = function () {
    $('.sortable-column').not('.ui-sortable').sortable({
      cancel: '.expanded-story, .column-template',
      connectWith: '.sortable-column',
      containment: '#content',
      distance: 10,
      tolerance: 'pointer',
      start: pub.onStoryStart,
      beforeStop: pub.onStoryBeforeStop,
      stop: pub.onStoryStop
    });
  };

  pub.layoutSortUpdate = function (element) {
    var name = element.data('name');
    var column = TT.Model.Layout.get({ name: name });
    var oldIndex = TT.Model.Layout.index({ name: name });
    var newIndex = oldIndex + (column.indexStop - column.indexStart);

    // modify newIndex to account for hidden columns
    var i, layout;
    if (oldIndex < newIndex) {
      for (i = oldIndex; i <= newIndex; i++) {
        layout = TT.Model.Layout.get()[i];
        if (layout.active === false) {
          newIndex++;
        }
      }
    } else if (oldIndex > newIndex) {
      for (i = oldIndex; i >= newIndex; i--) {
        layout = TT.Model.Layout.get()[i];
        if (layout.active === false) {
          newIndex--;
        }
      }
    }

    TT.Model.Layout.move(oldIndex, newIndex);
  };

  pub.init = function () {
    pub.initStorySorting();

    /*
    $('#filters').sortable({
      distance: 10,
      tolerance: 'pointer'
    });
    */

    $('#columns').not('.ui-sortable').sortable({
      distance: 10,
      handle: '.column-title',
      tolerance: 'pointer',
      start: function (event, ui) {
        ui.placeholder.width(ui.helper.width() - 4);
        var name = ui.item.data('name');
        TT.Model.Layout.update({ name: name }, { indexStart: ui.item.index() });
      },
      stop: function (event, ui) {
        var name = ui.item.data('name');
        TT.Model.Layout.update({ name: name }, { indexStop: ui.item.index() });
        pub.layoutSortUpdate(ui.item);
        TT.Model.Layout.clientSave();
        TT.View.refreshLayout();
      }
    });
  };

  return pub;

}());
