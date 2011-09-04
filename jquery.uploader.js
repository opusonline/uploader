/*!
 * jQuery HTML5 Upload plugin
 *
 * Copyright (c) 2011 Stefan Benicke
 *
 * Dual licensed under the MIT and GPL licenses
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */
(function($) {
	
	var defaults = {
		url: './',
		multiple: true,
		buttonText: 'Upload',
		eventNamespace: 'uploader',
		onSubmit: function(name) {},
		onProgress: function(name, loaded, total) {},
		onComplete: function(name, response) {},
		onError: function(name, message) {},
		onCancel: function(name, message) {},
	},
	upload_id = 0,
	xhr_support,
	progress_support,
	
	_checkXHRSupport = function() {
		var $test = $('<input type="file"/>')[0];
		xhr_support = (
			'multiple' in $test &&
			typeof File != 'undefined' &&
			typeof (new XMLHttpRequest()).upload != 'undefined'
		);
	},
	_checkProgressSupport = function() {
		var $test = $('<progress/>').appendTo('body');
		progress_support = 'value' in $test[0];
		$test.remove(); // workaround for polyfill DOMNodeInserted event
	},
	_formatSize = function(bytes) {
		bytes = parseFloat(bytes);
		var i = 0;
		while (bytes > 1023) {
			bytes /= 1024;
			i++;
		}
		if (i > 0) {
			bytes = bytes.toFixed(2);
		}
		return bytes + ' ' + ['Bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'][i];
	};
	
	_checkXHRSupport();
	_checkProgressSupport();
	
	$.fn.uploader = function(options) {
		
		options = $.extend({}, defaults, options);
		
		return this.each(function() {
			
			var $container = $(this), $wrap, $dropzone, $button, $input, $filelist, $form, $iframe,
			
			_upload = function() {
				if (xhr_support) {
					_traverseFiles($input[0].files);
				} else {
					_uploadFileIframe();
				}
			},
			_traverseFiles = function(files) {
				if (typeof files == 'undefined') return;
				for (var i = 0, l = files.length; i < l; i++) {
					_uploadFileXHR(files[i]);
				}
			},
			_uploadFileXHR = function(file) {
				var name = file.fileName || file.name,
				size = file.fileSize || file.size,
				type = file.fileType || file.type,
				start_time,
				
				$info = _createStatusFields(name, size),
				
				_showProgress = function(event) {
					if (event.lengthComputable) {
						var percent = Math.round((event.loaded / event.total) * 100),
						seconds = (new Date().getTime() - start_time) / 1000,
						average = _formatSize(event.loaded / seconds) + '/s';
						if ($info.progress) $info.progress.val(percent);
						$info.percent.html(percent + '%');
						$info.bandwidth.html('(' + average + ')');
						options.onProgress.call($info.list, name, event.loaded, event.total);
					}
				},
				_loadEnd = function() {
					response = {};
					if (xhr.readyState == 4) {
						if (xhr.status == 200) {
							response = xhr.responseText;
							_uploadSuccess();
						}
						options.onComplete.call($info.list, name, response);
					}
				},
				_loadError = function(event) {
					_uploadFailed();
					options.onError.call($info.lost, name, xhr.statusText);
				},
				_loadAbort = function(event) {
					_uploadFailed();
					options.onCancel.call($info.lost, name, xhr.statusText);
				},
				_abortUpload = function() {
					xhr.abort();
				},
				_uploadFailed = function() {
					$info.list.addClass('upload-failed');
					$info.abort.hide();
					$info.percent.hide();
					$info.bandwidth.hide();
					if ($info.progress) $info.progress.hide();
				},
				_uploadSuccess = function() {
					$info.list.addClass('upload-success');
					$info.abort.hide();
					$info.percent.hide();
					$info.bandwidth.hide();
					if ($info.progress) $info.progress.hide();
				},
				xhr = new XMLHttpRequest();
				
				if (xhr.upload) {
					xhr.upload.addEventListener('progress', _showProgress, false);
				}
				xhr.onreadystatechange = _loadEnd; // old school
				//xhr.addEventListener('load', _loadEnd, false);
				if (xhr.addEventListener) {
					xhr.addEventListener('error', _loadError, false);
					xhr.addEventListener('abort', _loadAbort, false);
				}
				xhr.open('POST', options.url, true);
				xhr.setRequestHeader('Content-Type', 'multipart/form-data');
				xhr.setRequestHeader('X-File-Name', name);
				xhr.setRequestHeader('X-File-Size', size);
				xhr.setRequestHeader('X-File-Type', type);
				
				$info.abort.bind('click.' + options.eventNamespace, _abortUpload);
				options.onSubmit.call($info.list, name);
				
				try {
					xhr.send(file);
					start_time = new Date().getTime();
				} catch (exception) {
					_uploadFailed();
					options.onError.call($info.list, name, exception.message);
				}
			},
			_uploadFileIframe = function() {
				var name = $input.val().replace(/.*(\/|\\)/, ''),
				$info = _createStatusFields(name);
				options.onSubmit.call($info.list, name);
				$form.data({name: name, fields: $info}).submit();
			},
			_iframeLoad = function() {
				var $info = $form.data('fields'),
				name = $form.data('name'),
				response = _getIframeContent();
				$info.list.addClass('upload-success');
				options.onComplete.call($info.list, name, response);
			},
			_getIframeContent = function() {
				var content = $iframe.contents().find('body').html();
				return content;
			},
			_createStatusFields = function(name, size) {
				size = size ? _formatSize(size) : '';
				var display = xhr_support ? '' : ' style="display:none"',
				$status, $file, $size, $percent, $abort, $progress,
				$list = $('<li/>').append(
					$status = $('<span class="upload-status"/>'),
					$file = $('<span class="upload-file">' + name + '</span>'),
					$size = $('<span class="upload-size"' + display + '>' + size + '</span>'),
					$abort = $('<input type="button" class="upload-abort"' + display + ' value="abort"/>'),
					'<br/>'
				).appendTo($filelist);
				if (xhr_support && progress_support) {
					$list.append(
						$progress =  $('<progress max="100"/>')
					);
				}
				$list.append(
					$percent = $('<span class="upload-percent"' + display + '/>'),
					$bandwidth = $('<span class="upload-bandwidth"' + display + '/>')
				);
				
				return {
					list: $list,
					status: $status,
					file: $file,
					size: $size,
					abort: $abort,
					progress: $progress,
					percent: $percent,
					bandwidth: $bandwidth
				};
			},
			_showDropzone = function(event) {
				_preventEvent(event);
				$dropzone.show();
			},
			_hideDropzone = function(event) {
				_preventEvent(event);
				var related = document.elementFromPoint(event.clientX, event.clientY),
				source = event.srcElement ? event.srcElement && event.srcElement.nodeName == 'HTML' : true;  // Firefox bug: not firing documents dragleave
				if ( ! related || (related && related.nodeName == 'HTML' && source)) { // only outside the document
					$dropzone.hide();
				}
			},
			_dragNothing = function(event) {
				_preventEvent(event);
			},
			_enterDropzone = function(event) {
				_preventEvent(event);
				$dropzone.addClass('active');
			},
			_leaveDropzone = function(event) {
				_preventEvent(event);
				$dropzone.removeClass('active');
			},
			_dropFile = function(event) {
				_preventEvent(event);
				$dropzone.removeClass('active').hide();
				var files = event.originalEvent.dataTransfer.files || event.dataTransfer.files;
				_traverseFiles(files);
				$(document).trigger('wasdropped.' + options.eventNamespace);
			},
			_preventEvent = function(event) {
				event.preventDefault();
				event.stopPropagation();
			},
			_init = function() {
				var multiple = xhr_support && options.multiple ? ' multiple' : '';
				$(document)
					.bind('dragenter.' + options.eventNamespace, _showDropzone)
					.bind('dragleave.' + options.eventNamespace, _hideDropzone)
					.bind('wasdropped.' + options.eventNamespace, _hideDropzone);
				$wrap = $('<div class="uploader" style="position:relative"/>')
					.appendTo($container);
				$dropzone = $('<div class="upload-dropzone" style="display:none;position:absolute;top:0;left:0;z-index:2;width:100%;height:100%;text-align:center;min-height:50px">Drop files here</div>')
					.bind('dragover.' + options.eventNamespace, _dragNothing)
					.bind('dragenter.' + options.eventNamespace, _enterDropzone)
					.bind('dragleave.' + options.eventNamespace, _leaveDropzone)
					.bind('drop.' + options.eventNamespace, _dropFile)
					.appendTo($wrap);
				$button = $('<div class="upload-button" style="position:relative;overflow:hidden;text-align:center">' + options.buttonText + '</div>')
					.appendTo($wrap);
				$input = $('<input type="file" name="file" tabindex="-1"' + multiple + ' style="position:absolute;top:0;right:0;margin:0;padding:0;opacity:0;font-size:118px;cursor:pointer"/>')
					.bind('change.' + options.eventNamespace, _upload)
					.appendTo($button);
				$filelist = $('<ul class="upload-list"/>')
					.appendTo($wrap);
				if ( ! xhr_support) {
					$form = $('<form action="' + options.url + '" method="POST" enctype="multipart/form-data" target="upload-iframe-' + upload_id + '"/>')
						.appendTo($button)
						.append($input);
					$iframe = $('<iframe src="javascript:false;" id="upload-iframe-' + upload_id + '" name="upload-iframe-' + upload_id + '" style="display:none"/>')
						.bind('load.' + options.eventNamespace, _iframeLoad)
						.appendTo('body');
				}
				upload_id++;
			};
			
			_init();
			
		});
		
	};
	
})(jQuery);
