<?php

$path = './uploads/';
$filename = '';
$response = array('status' => 'failed', 'name' => $filename);

function saveForm() {
	global $path, $filename;
	$filename = $path.$_FILES['file']['name'];
	while (file_exists($filename)) {
		$parts = explode('.', $filename);
		$extension = array_pop($parts);
		$filename = implode('.', $parts) . '_' . time() . '.' . $extension;
	}
	if( ! move_uploaded_file($_FILES['file']['tmp_name'], $filename)) {
		return false;
	}
	return true;
}

function saveXHR() {
	global $path, $filename;
	$headers = getallheaders();
	
	$file = array(
		'name' => $headers['X-File-Name'],
		'size' => $headers['X-File-Size'],
		'type' => $headers['X-File-Type']
	);
	$input = fopen("php://input", "r");
	$temp = tmpfile();
	$realSize = stream_copy_to_stream($input, $temp);
	fclose($input);

	if ($realSize != $file['size']) {
		return false;
	}
	$filename = $path.$file['name'];
	while (file_exists($filename)) {
		$parts = explode('.', $filename);
		$extension = array_pop($parts);
		$filename = implode('.', $parts) . '_' . time() . '.' . $extension;
	}
	$target = fopen($filename, "w");
	fseek($temp, 0, SEEK_SET);
	stream_copy_to_stream($temp, $target);
	fclose($target);
	
	return true;
}

/*if (isset($_FILES['file']) ? saveForm() : saveXHR()) {
	$response['status'] = 'success';
	$response['name'] = $filename;
}*/

echo htmlspecialchars(json_encode($response), ENT_NOQUOTES);
